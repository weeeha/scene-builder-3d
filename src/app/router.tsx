import { createBrowserRouter } from "react-router";

import { ProjectsPage } from "@/app/routes/ProjectsPage";
import { ProjectLayout } from "@/app/routes/ProjectLayout";
import { BoardPage } from "@/app/routes/BoardPage";
import { PropsPage } from "@/app/routes/PropsPage";

export const router = createBrowserRouter([
  { path: "/", element: <ProjectsPage /> },
  {
    path: "/p/:projectId",
    element: <ProjectLayout />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "props", element: <PropsPage /> },
    ],
  },
]);
