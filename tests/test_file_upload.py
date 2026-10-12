"""File upload and download."""
import re

import pytest
from playwright.sync_api import Page, expect

from pages.files_page import FilesPage, file_payload

PDF = file_payload("report.pdf", b"%PDF-1.4\n%QA sample\n", "application/pdf")
PNG_BYTES = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000")
PNG = file_payload("logo.png", PNG_BYTES, "image/png")
CSV = file_payload("data.csv", b"id,name\n1,Ada\n", "text/csv")


def test_upload_single_valid_file(page: Page):
    files = FilesPage(page).open()
    files.upload_single(PDF)
    expect(files.tid("single-upload-status")).to_have_text("Uploaded 1 file successfully")
    expect(files.uploaded_names).to_have_text(["report.pdf"])
    expect(files.tid("no-files-message")).to_be_hidden()
    expect(files.tid("uploaded-count")).to_have_text("1")


def test_upload_without_choosing_a_file(page: Page):
    files = FilesPage(page).open()
    files.tid("single-upload-btn").click()
    expect(files.tid("single-upload-status")).to_have_text("Choose a file first")


def test_upload_multiple_files(page: Page):
    files = FilesPage(page).open()
    files.upload_multiple([PDF, PNG, CSV])
    expect(files.tid("multi-upload-status")).to_have_text("Uploaded 3 files successfully")
    expect(files.uploaded_names).to_have_text(["report.pdf", "logo.png", "data.csv"])


def test_drag_and_drop_zone_upload(page: Page):
    files = FilesPage(page).open()
    files.drop_files([CSV, PDF])
    expect(files.tid("drop-zone-status")).to_have_text("Uploaded 2 files successfully")
    expect(files.uploaded_names).to_have_count(2)


@pytest.mark.parametrize(
    "payload, message",
    [
        (file_payload("script.exe", b"MZ-binary"), 'type ".exe" is not allowed'),
        (file_payload("notes.txt", b"text"), 'type ".txt" is not allowed'),
        (file_payload("empty.csv", b""), "file is empty"),
        (file_payload("huge.pdf", b"%PDF-1.4" + b" " * (2 * 1024 * 1024 + 10), "application/pdf"), "exceeds the 2 MB limit"),
    ],
    ids=["exe", "txt", "empty", "too-large"],
)
def test_client_side_validation_errors(page: Page, payload, message):
    files = FilesPage(page).open()
    files.upload_single(payload)
    expect(files.errors).to_have_count(1)
    expect(files.errors.first).to_contain_text(message)
    expect(files.tid("single-upload-status")).to_have_text("Upload failed")
    expect(files.uploaded_names).to_have_count(0)


def test_server_rejects_content_that_does_not_match_extension(page: Page):
    files = FilesPage(page).open()
    files.upload_single(file_payload("not-really.png", b"this is plain text", "image/png"))
    expect(files.errors.first).to_contain_text("File content is not a PNG")
    expect(files.uploaded_names).to_have_count(0)


def test_partial_success_reports_both(page: Page):
    files = FilesPage(page).open()
    files.upload_multiple([PDF, file_payload("bad.txt", b"x")])
    expect(files.tid("multi-upload-status")).to_have_text("Uploaded 1, 1 failed")
    expect(files.uploaded_names).to_have_text(["report.pdf"])
    expect(files.errors).to_have_count(1)


def test_upload_with_progress_bar(page: Page):
    files = FilesPage(page).open()
    bar = files.tid("upload-progress")
    expect(bar).to_have_attribute("aria-valuenow", "0")
    files.upload_with_progress(CSV)
    expect(files.tid("progress-status")).to_contain_text("Uploading")  # the server takes about 2 s
    expect(files.tid("progress-upload-btn")).to_be_disabled()
    expect(files.tid("progress-status")).to_have_text("Upload complete", timeout=8_000)
    expect(bar).to_have_attribute("aria-valuenow", "100")
    expect(files.uploaded_names).to_have_text(["data.csv"])


def test_delete_uploaded_file(page: Page):
    files = FilesPage(page).open()
    files.upload_multiple([PDF, CSV])
    expect(files.uploaded_names).to_have_count(2)
    files.delete_file("report.pdf")
    expect(files.uploaded_names).to_have_text(["data.csv"])
    files.delete_file("data.csv")
    expect(files.tid("no-files-message")).to_be_visible()


def test_uploads_are_cleared_by_reset(page: Page, api):
    files = FilesPage(page).open()
    files.upload_single(PDF)
    expect(files.uploaded_names).to_have_count(1)
    assert api.post("/api/reset").ok
    page.reload()
    expect(files.uploaded_names).to_have_count(0)


@pytest.mark.parametrize(
    "testid, filename, signature",
    [("download-pdf-link", "sample.pdf", b"%PDF"), ("download-csv-link", "sample.csv", b"id,name"), ("download-image-link", "sample.png", b"\x89PNG")],
)
def test_file_downloads(page: Page, testid, filename, signature):
    files = FilesPage(page).open()
    with page.expect_download() as download_info:
        files.tid(testid).click()
    download = download_info.value
    assert download.suggested_filename == filename
    with open(download.path(), "rb") as saved:
        assert saved.read().startswith(signature)


def test_delayed_download(page: Page):
    files = FilesPage(page).open()
    with page.expect_download(timeout=10_000) as download_info:
        files.tid("delayed-download-btn").click()
        expect(files.tid("download-status")).to_have_text("Preparing download...")
    assert download_info.value.suggested_filename == "delayed-sample.pdf"
    expect(files.tid("download-status")).to_have_text("Download ready: delayed-sample.pdf")
