from .base_page import BasePage


class AdvancedPage(BasePage):
    path = "/advanced.html"

    def draw_stroke(self, points: list[tuple[int, int]]):
        canvas = self.tid("drawing-canvas")
        box = canvas.bounding_box()
        border = canvas.evaluate("c => c.clientLeft")  # points are relative to the drawing surface, inside the border
        ox, oy = box["x"] + border, box["y"] + border
        first, *rest = points
        self.page.mouse.move(ox + first[0], oy + first[1])
        self.page.mouse.down()
        for x, y in rest:
            self.page.mouse.move(ox + x, oy + y)
        self.page.mouse.up()
