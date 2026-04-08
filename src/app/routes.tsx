import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        lazy: async () => {
          const m = await import("./pages/Dashboard");
          return { Component: m.Dashboard };
        },
      },
      {
        path: "checkin",
        lazy: async () => {
          const m = await import("./pages/CheckIn");
          return { Component: m.CheckIn };
        },
      },
      {
        path: "timetable",
        lazy: async () => {
          const m = await import("./pages/Timetable");
          return { Component: m.Timetable };
        },
      },
      {
        path: "tasks",
        lazy: async () => {
          const m = await import("./pages/Tasks");
          return { Component: m.Tasks };
        },
      },
      {
        path: "study-plans",
        lazy: async () => {
          const m = await import("./pages/StudyPlans");
          return { Component: m.StudyPlans };
        },
      },
      {
        path: "focus",
        lazy: async () => {
          const m = await import("./pages/FocusTimer");
          return { Component: m.FocusTimer };
        },
      },
      {
        path: "finance",
        lazy: async () => {
          const m = await import("./pages/Finance");
          return { Component: m.Finance };
        },
      },
      {
        path: "habits",
        lazy: async () => {
          const m = await import("./pages/Habits");
          return { Component: m.Habits };
        },
      },
      {
        path: "analytics",
        lazy: async () => {
          const m = await import("./pages/Analytics");
          return { Component: m.Analytics };
        },
      },
      {
        path: "ideas",
        lazy: async () => {
          const m = await import("./pages/Ideas");
          return { Component: m.Ideas };
        },
      },
      {
        path: "events",
        lazy: async () => {
          const m = await import("./pages/Events");
          return { Component: m.Events };
        },
      },
      {
        path: "minigame",
        lazy: async () => {
          const m = await import("./pages/Minigame");
          return { Component: m.Minigame };
        },
      },
    ],
  },
]);