"""Mouse and keyboard actions."""
from playwright.sync_api import Page, expect

from pages.mouse_page import MousePage


def test_hover_menu_opens_and_item_can_be_chosen(page: Page):
    mouse = MousePage(page).open()
    expect(mouse.tid("hover-menu")).to_be_hidden()
    mouse.tid("hover-menu-trigger").hover()
    expect(mouse.tid("hover-menu")).to_be_visible()
    mouse.tid("hover-item-settings").click()
    expect(mouse.tid("hover-result")).to_have_text("You chose: Settings")
    expect(mouse.tid("hover-menu")).to_be_hidden()


def test_tooltip_on_hover_and_focus(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("tooltip-trigger").hover()
    expect(mouse.tid("tooltip")).to_be_visible()
    expect(mouse.tid("tooltip")).to_have_text("This is a tooltip")
    page.mouse.move(0, 0)
    expect(mouse.tid("tooltip")).to_be_hidden()
    mouse.tid("tooltip-trigger").focus()
    expect(mouse.tid("tooltip")).to_be_visible()


def test_right_click_context_menu(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("context-area").click(button="right")
    expect(mouse.tid("context-menu")).to_be_visible()
    mouse.tid("context-copy").click()
    expect(mouse.tid("context-result")).to_have_text("Context action: Copy")
    expect(mouse.tid("context-menu")).to_be_hidden()


def test_context_menu_closes_on_escape(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("context-area").click(button="right")
    expect(mouse.tid("context-menu")).to_be_visible()
    page.keyboard.press("Escape")
    expect(mouse.tid("context-menu")).to_be_hidden()


def test_double_click(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("double-click-btn").click()
    expect(mouse.tid("double-click-result")).to_have_text("Not double-clicked yet")
    mouse.tid("double-click-btn").dblclick()
    expect(mouse.tid("double-click-result")).to_have_text("Double-click detected!")
    expect(mouse.tid("click-count")).to_have_text("3")  # 1 click + the 2 clicks inside the double-click


def test_drag_and_drop_onto_target(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("drag-source").drag_to(mouse.tid("drop-target"))
    expect(mouse.tid("drag-result")).to_have_text("Dropped on target")
    expect(mouse.tid("drop-target")).to_contain_text("Dropped!")
    expect(mouse.tid("drop-target").get_by_test_id("drag-source")).to_be_visible()
    mouse.tid("drag-reset-btn").click()
    expect(mouse.tid("drag-result")).to_have_text("Not dropped yet")


def test_drag_outside_target_does_not_drop(page: Page):
    mouse = MousePage(page).open()
    box = mouse.tid("drag-source").bounding_box()
    page.mouse.move(box["x"] + 10, box["y"] + 10)
    page.mouse.down()
    page.mouse.move(box["x"] + 10, box["y"] + 200, steps=5)
    page.mouse.up()
    expect(mouse.tid("drag-result")).to_have_text("Dropped outside the target")


def test_sortable_list_by_dragging(page: Page):
    mouse = MousePage(page).open()
    assert mouse.sortable_order() == "one, two, three, four"
    mouse.tid("sortable-item-four").drag_to(mouse.tid("sortable-item-one"), target_position={"x": 20, "y": 3})
    expect(mouse.tid("sortable-order")).to_have_text("four, one, two, three")


def test_sortable_list_with_keyboard(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("sortable-item-one").focus()
    page.keyboard.press("Alt+ArrowDown")
    page.keyboard.press("Alt+ArrowDown")
    expect(mouse.tid("sortable-order")).to_have_text("two, three, one, four")
    page.keyboard.press("Alt+ArrowUp")
    expect(mouse.tid("sortable-order")).to_have_text("two, one, three, four")


def test_key_display_shows_key_code_and_modifiers(page: Page):
    mouse = MousePage(page).open()
    mouse.press_in_key_input("Shift+A")
    expect(mouse.tid("key-display")).to_have_text("A")
    expect(mouse.tid("key-code")).to_have_text("KeyA")
    expect(mouse.tid("key-modifiers")).to_have_text("Shift")
    mouse.press_in_key_input("ArrowLeft")
    expect(mouse.tid("key-display")).to_have_text("ArrowLeft")
    expect(mouse.tid("key-modifiers")).to_have_text("none")


def test_keyboard_shortcuts(page: Page):
    mouse = MousePage(page).open()
    mouse.tid("key-input").fill("some text")
    mouse.press_in_key_input("Control+s")
    expect(mouse.tid("shortcut-result")).to_have_text("Shortcut: Save (Ctrl+S)")
    mouse.press_in_key_input("Alt+h")
    expect(mouse.tid("shortcut-result")).to_have_text("Shortcut: Help (Alt+H)")
    mouse.press_in_key_input("Control+Shift+K")
    expect(mouse.tid("shortcut-result")).to_have_text("Shortcut: Clear (Ctrl+Shift+K)")
    expect(mouse.tid("key-input")).to_have_value("")


def test_scroll_target_into_view(page: Page):
    mouse = MousePage(page).open()
    expect(mouse.tid("scroll-status")).to_have_text("Target is not visible")
    mouse.tid("scroll-to-target-btn").click()
    expect(mouse.tid("scroll-status")).to_have_text("Target is visible", timeout=5_000)
    mouse.tid("scroll-target-btn").click()
    expect(mouse.tid("scroll-target-result")).to_have_text("Clicked the bottom button")
