import { createBrowserRouter } from "react-router";

import { ProjectsPage } from "@/app/routes/ProjectsPage";
import { ProjectLayout } from "@/app/routes/ProjectLayout";
import { BoardPage } from "@/app/routes/BoardPage";
import { PropsPage } from "@/app/routes/PropsPage";
import { StageLayout } from "@/app/routes/StageLayout";
import { ScenePage } from "@/app/routes/ScenePage";
import { ShotPage } from "@/app/routes/ShotPage";

export const router = createBrowserRouter([
  { path: "/", element: <ProjectsPage /> },
  {
    path: "/p/:projectId",
    element: <ProjectLayout />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "props", element: <PropsPage /> },
      {
        element: <StageLayout />,
        children: [
          { path: "scene/:sceneId", element: <ScenePage /> },
          { path: "shot/:shotId", element: <ShotPage /> },
        ],
      },
    ],
  },
]);
