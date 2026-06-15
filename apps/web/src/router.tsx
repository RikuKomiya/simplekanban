import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AuthGate } from '@/components/layout/AuthGate';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/routes/LoginPage';
import { SignupPage } from '@/routes/SignupPage';
import { OnboardingPage } from '@/routes/OnboardingPage';
import { WorkspaceIndexRoute } from '@/routes/WorkspaceIndexRoute';
import { InboxPage } from '@/routes/InboxPage';
import { MyIssuesPage } from '@/routes/MyIssuesPage';
import { BoardPage } from '@/routes/BoardPage';
import { ListPage } from '@/routes/ListPage';
import { CyclesPage } from '@/routes/CyclesPage';
import { ProjectsPage } from '@/routes/ProjectsPage';
import { ProjectDetailPage } from '@/routes/ProjectDetailPage';
import { IssuePage } from '@/routes/IssuePage';
import { SettingsLayout } from '@/routes/settings/SettingsLayout';
import { MembersSettings } from '@/routes/settings/MembersSettings';
import { LabelsSettings } from '@/routes/settings/LabelsSettings';
import { ApiKeysSettings } from '@/routes/settings/ApiKeysSettings';
import { TeamsSettings } from '@/routes/settings/TeamsSettings';
import { StatusesSettings } from '@/routes/settings/StatusesSettings';
import { WorkspaceGeneralSettings } from '@/routes/settings/WorkspaceGeneralSettings';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// ---------------------------------------------------------------------------
// Public (no auth)
// ---------------------------------------------------------------------------

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
});

// ---------------------------------------------------------------------------
// Authenticated layout (everything else)
// ---------------------------------------------------------------------------

const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  component: () => (
    <AuthGate>
      <Outlet />
    </AuthGate>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/',
  beforeLoad: () => {
    // Pick-a-workspace happens client-side; AuthGate handles redirect.
    throw redirect({ to: '/onboarding' });
  },
});

const onboardingRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

// Workspace-scoped shell — renders the sidebar + topbar.
const wsShellRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/$ws',
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const wsIndexRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/',
  component: WorkspaceIndexRoute,
});

const inboxRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/inbox',
  component: InboxPage,
});

const myIssuesRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/my-issues',
  component: MyIssuesPage,
});

const boardRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/team/$teamKey/board',
  component: BoardPage,
});

const teamListRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/team/$teamKey/issues',
  component: ListPage,
});

const cyclesRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/team/$teamKey/cycles',
  component: CyclesPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/projects',
  component: ProjectsPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/project/$projectId',
  component: ProjectDetailPage,
});

const issueRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/issue/$identifier',
  component: IssuePage,
});

// Settings
const settingsRoute = createRoute({
  getParentRoute: () => wsShellRoute,
  path: '/settings',
  component: SettingsLayout,
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: WorkspaceGeneralSettings,
});

const settingsMembersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/members',
  component: MembersSettings,
});

const settingsLabelsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/labels',
  component: LabelsSettings,
});

const settingsApiKeysRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/api-keys',
  component: ApiKeysSettings,
});

const settingsTeamsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/teams',
  component: TeamsSettings,
});

const settingsStatusesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/statuses',
  component: StatusesSettings,
});

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

const routeTree = rootRoute.addChildren([
  loginRoute,
  signupRoute,
  authedRoute.addChildren([
    indexRoute,
    onboardingRoute,
    wsShellRoute.addChildren([
      wsIndexRoute,
      inboxRoute,
      myIssuesRoute,
      boardRoute,
      teamListRoute,
      cyclesRoute,
      projectsRoute,
      projectDetailRoute,
      issueRoute,
      settingsRoute.addChildren([
        settingsIndexRoute,
        settingsTeamsRoute,
        settingsStatusesRoute,
        settingsMembersRoute,
        settingsLabelsRoute,
        settingsApiKeysRoute,
      ]),
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
