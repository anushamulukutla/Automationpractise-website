from playwright.sync_api import Locator

from .base_page import BasePage


def file_payload(name: str, content: bytes, mime: str = "application/octet-stream") -> dict:
    """In-memory file for set_input_files (no temp files needed)."""
    return {"name": name, "mimeType": mime, "buffer": content}


class FilesPage(BasePage):
    path = "/files.html"

    def upload_single(self, payload: dict):
        self.tid("single-file-input").set_input_files(payload)
        self.tid("single-upload-btn").click()

    def upload_multiple(self, payloads: list[dict]):
        self.tid("multi-file-input").set_input_files(payloads)
        self.tid("multi-upload-btn").click()

    def drop_files(self, payloads: list[dict]):
        # The drop zone wraps a real <input type=file>, so set_input_files exercises the same code path.
        self.tid("drop-zone-input").set_input_files(payloads)

    def upload_with_progress(self, payload: dict):
        self.tid("progress-file-input").set_input_files(payload)
        self.tid("progress-upload-btn").click()

    @property
    def uploaded_names(self) -> Locator:
        return self.tid("uploaded-file-name")

    @property
    def errors(self) -> Locator:
        return self.tid("upload-error-item")

    def delete_file(self, name: str):
        row = self.tid("uploaded-file-row").filter(has_text=name)
        row.get_by_test_id("delete-file-btn").click()
