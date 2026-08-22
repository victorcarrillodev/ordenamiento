import { createController } from "remix/router";
import { routes } from "../../routes.ts";
import { PoetdumPage } from "./show-page.tsx";

export default createController(routes.poetdum, {
  actions: {
    show(context) {
      return context.render(<PoetdumPage />);
    },
  },
});