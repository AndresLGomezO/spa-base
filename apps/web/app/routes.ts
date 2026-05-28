import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  route("login", "./routes/login.tsx"),
  layout("./routes/private-layout.tsx", [index("./routes/home.tsx")]),
] satisfies RouteConfig;
