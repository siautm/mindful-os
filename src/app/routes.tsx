import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Timetable } from "./pages/Timetable";
import { Tasks } from "./pages/Tasks";
import { FocusTimer } from "./pages/FocusTimer";
import { Finance } from "./pages/Finance";
import { Ideas } from "./pages/Ideas";
import { Events } from "./pages/Events";
import { Analytics } from "./pages/Analytics";
import { Minigame } from "./pages/Minigame";
import { CheckIn } from "./pages/CheckIn";
import { StudyPlans } from "./pages/StudyPlans";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "checkin", element: <CheckIn /> },
      { path: "timetable", element: <Timetable /> },
      { path: "tasks", element: <Tasks /> },
      { path: "study-plans", element: <StudyPlans /> },
      { path: "focus", element: <FocusTimer /> },
      { path: "finance", element: <Finance /> },
      { path: "analytics", element: <Analytics /> },
      { path: "ideas", element: <Ideas /> },
      { path: "events", element: <Events /> },
      { path: "minigame", element: <Minigame /> },
    ],
  },
]);