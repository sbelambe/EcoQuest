import { createBrowserRouter } from "react-router";
import { Home } from "./screens/Home";
import { Scan } from "./screens/Scan";
import { ScanResult } from "./screens/ScanResult";
import { Disposal } from "./screens/Disposal";
import { Profile } from "./screens/Profile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/scan",
    Component: Scan,
  },
  {
    path: "/scan-result",
    Component: ScanResult,
  },
  {
    path: "/disposal",
    Component: Disposal,
  },
  {
    path: "/profile",
    Component: Profile,
  },
]);
