/**
 * Static, hand-written OpenAPI 3.1 document describing the `/api/v1` surface.
 * Returned verbatim from `GET /api/v1/openapi.json` so coding agents can read
 * and drive the API. Kept intentionally dependency-free.
 */

const errorResponse = {
  description: 'Error',
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
  },
};

function dataResponse(ref: string, description = 'Success') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['data'],
          properties: { data: { $ref: ref } },
        },
      },
    },
  };
}

function listResponse(ref: string, description = 'Success') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['data'],
          properties: { data: { type: 'array', items: { $ref: ref } } },
        },
      },
    },
  };
}

function jsonBody(ref: string, required = true) {
  return {
    required,
    content: {
      'application/json': { schema: { $ref: ref } },
    },
  };
}

const commonErrors = {
  '400': errorResponse,
  '401': errorResponse,
  '403': errorResponse,
  '404': errorResponse,
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'SimpleKanban API',
    version: '1.0.0',
    description:
      'REST API for SimpleKanban. Auth via better-auth session cookie ' +
      '(web) or `Authorization: Bearer sk_...` API key (CLI/agents). All ' +
      'workspace-scoped resources require membership.',
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/me': {
      get: {
        operationId: 'getMe',
        summary: 'Current user and their workspaces',
        responses: { '200': dataResponse('#/components/schemas/Me'), ...commonErrors },
      },
    },
    '/auth-methods': {
      get: {
        operationId: 'getAuthMethods',
        summary: 'Enabled sign-in methods',
        security: [],
        responses: {
          '200': {
            description: 'Enabled sign-in methods',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthMethods' },
              },
            },
          },
        },
      },
    },
    '/workspaces': {
      post: {
        operationId: 'createWorkspace',
        summary: 'Create a workspace (creator becomes admin)',
        requestBody: jsonBody('#/components/schemas/CreateWorkspaceInput'),
        responses: {
          '201': dataResponse('#/components/schemas/Workspace'),
          '409': errorResponse,
          ...commonErrors,
        },
      },
    },
    '/workspaces/{ws}': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      get: {
        operationId: 'getWorkspace',
        summary: 'Workspace detail (teams, members, labels)',
        responses: {
          '200': dataResponse('#/components/schemas/WorkspaceDetail'),
          ...commonErrors,
        },
      },
    },
    '/workspaces/{ws}/members': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      post: {
        operationId: 'inviteMember',
        summary: 'Invite an existing user by email',
        requestBody: jsonBody('#/components/schemas/InviteMemberInput'),
        responses: {
          '201': dataResponse('#/components/schemas/WorkspaceMemberWithUser'),
          '409': errorResponse,
          ...commonErrors,
        },
      },
    },
    '/workspaces/{ws}/teams': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      get: {
        operationId: 'listTeams',
        summary: 'List teams in a workspace',
        responses: { '200': listResponse('#/components/schemas/Team'), ...commonErrors },
      },
      post: {
        operationId: 'createTeam',
        summary: 'Create a team (seeds default workflow states)',
        requestBody: jsonBody('#/components/schemas/CreateTeamInput'),
        responses: {
          '201': dataResponse('#/components/schemas/Team'),
          '409': errorResponse,
          ...commonErrors,
        },
      },
    },
    '/teams/{teamId}': {
      parameters: [{ $ref: '#/components/parameters/teamId' }],
      get: {
        operationId: 'getTeam',
        summary: 'Get a team',
        responses: { '200': dataResponse('#/components/schemas/Team'), ...commonErrors },
      },
      patch: {
        operationId: 'updateTeam',
        requestBody: jsonBody('#/components/schemas/UpdateTeamInput'),
        responses: { '200': dataResponse('#/components/schemas/Team'), ...commonErrors },
      },
      delete: {
        operationId: 'deleteTeam',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/teams/{teamId}/states': {
      parameters: [{ $ref: '#/components/parameters/teamId' }],
      get: {
        operationId: 'listStates',
        responses: {
          '200': listResponse('#/components/schemas/WorkflowState'),
          ...commonErrors,
        },
      },
      post: {
        operationId: 'createState',
        requestBody: jsonBody('#/components/schemas/CreateStateInput'),
        responses: {
          '201': dataResponse('#/components/schemas/WorkflowState'),
          ...commonErrors,
        },
      },
    },
    '/states/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      patch: {
        operationId: 'updateState',
        requestBody: jsonBody('#/components/schemas/UpdateStateInput'),
        responses: {
          '200': dataResponse('#/components/schemas/WorkflowState'),
          ...commonErrors,
        },
      },
      delete: {
        operationId: 'deleteState',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/teams/{teamId}/issues': {
      parameters: [{ $ref: '#/components/parameters/teamId' }],
      get: {
        operationId: 'listIssues',
        summary: 'List issues with optional filters',
        parameters: [
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'assignee', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 4 } },
          { name: 'label', in: 'query', schema: { type: 'string' } },
          { name: 'cycle', in: 'query', schema: { type: 'string' } },
          { name: 'project', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'updatedSince', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data', 'pageInfo'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/IssueWithRelations' },
                    },
                    pageInfo: { $ref: '#/components/schemas/PageInfo' },
                  },
                },
              },
            },
          },
          ...commonErrors,
        },
      },
      post: {
        operationId: 'createIssue',
        requestBody: jsonBody('#/components/schemas/CreateIssueInput'),
        responses: {
          '201': dataResponse('#/components/schemas/IssueDetail'),
          ...commonErrors,
        },
      },
    },
    '/issues/batch': {
      post: {
        operationId: 'batchIssues',
        summary: 'Fetch visible issues by id, preserving requested order',
        requestBody: jsonBody('#/components/schemas/IssueBatchInput'),
        responses: {
          '200': listResponse('#/components/schemas/IssueWithRelations'),
          ...commonErrors,
        },
      },
    },
    '/issues/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      get: {
        operationId: 'getIssue',
        responses: {
          '200': dataResponse('#/components/schemas/IssueDetail'),
          ...commonErrors,
        },
      },
      patch: {
        operationId: 'updateIssue',
        summary: 'Partial update (sortOrder/stateId for board DnD)',
        requestBody: jsonBody('#/components/schemas/UpdateIssueInput'),
        responses: {
          '200': dataResponse('#/components/schemas/IssueDetail'),
          ...commonErrors,
        },
      },
      delete: {
        operationId: 'deleteIssue',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/issues/by-key/{identifier}': {
      parameters: [
        { name: 'identifier', in: 'path', required: true, schema: { type: 'string' }, example: 'ENG-42' },
      ],
      get: {
        operationId: 'getIssueByKey',
        responses: {
          '200': dataResponse('#/components/schemas/IssueDetail'),
          ...commonErrors,
        },
      },
    },
    '/issues/{id}/comments': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      get: {
        operationId: 'listIssueComments',
        responses: {
          '200': listResponse('#/components/schemas/CommentWithAuthor'),
          ...commonErrors,
        },
      },
      post: {
        operationId: 'createComment',
        requestBody: jsonBody('#/components/schemas/CreateCommentInput'),
        responses: {
          '201': dataResponse('#/components/schemas/Comment'),
          ...commonErrors,
        },
      },
    },
    '/issues/{id}/activity': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      get: {
        operationId: 'listIssueActivity',
        responses: {
          '200': listResponse('#/components/schemas/IssueActivityWithActor'),
          ...commonErrors,
        },
      },
    },
    '/issues/{id}/blockers': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      get: {
        operationId: 'listIssueBlockers',
        responses: {
          '200': listResponse('#/components/schemas/IssueBlockerRef'),
          ...commonErrors,
        },
      },
      post: {
        operationId: 'addIssueBlocker',
        requestBody: jsonBody('#/components/schemas/AddIssueBlockerInput'),
        responses: {
          '201': dataResponse('#/components/schemas/IssueDetail'),
          ...commonErrors,
        },
      },
    },
    '/issues/{id}/blockers/{blockerIssueId}': {
      parameters: [
        { $ref: '#/components/parameters/id' },
        { name: 'blockerIssueId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      delete: {
        operationId: 'removeIssueBlocker',
        responses: { '204': { description: 'Removed' }, ...commonErrors },
      },
    },
    '/issues/{id}/usage': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      post: {
        operationId: 'addIssueUsage',
        requestBody: jsonBody('#/components/schemas/AddIssueUsageInput'),
        responses: {
          '200': dataResponse('#/components/schemas/IssueUsage'),
          ...commonErrors,
        },
      },
    },
    '/comments/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      patch: {
        operationId: 'updateComment',
        requestBody: jsonBody('#/components/schemas/UpdateCommentInput'),
        responses: {
          '200': dataResponse('#/components/schemas/Comment'),
          ...commonErrors,
        },
      },
      delete: {
        operationId: 'deleteComment',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/issues/{id}/labels': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      post: {
        operationId: 'addIssueLabel',
        requestBody: jsonBody('#/components/schemas/AddIssueLabelInput'),
        responses: { '204': { description: 'Added' }, ...commonErrors },
      },
    },
    '/issues/{id}/labels/{labelId}': {
      parameters: [
        { $ref: '#/components/parameters/id' },
        { name: 'labelId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      delete: {
        operationId: 'removeIssueLabel',
        responses: { '204': { description: 'Removed' }, ...commonErrors },
      },
    },
    '/workspaces/{ws}/labels': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      get: {
        operationId: 'listLabels',
        responses: { '200': listResponse('#/components/schemas/Label'), ...commonErrors },
      },
      post: {
        operationId: 'createLabel',
        requestBody: jsonBody('#/components/schemas/CreateLabelInput'),
        responses: { '201': dataResponse('#/components/schemas/Label'), ...commonErrors },
      },
    },
    '/labels/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      patch: {
        operationId: 'updateLabel',
        requestBody: jsonBody('#/components/schemas/UpdateLabelInput'),
        responses: { '200': dataResponse('#/components/schemas/Label'), ...commonErrors },
      },
      delete: {
        operationId: 'deleteLabel',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/workspaces/{ws}/projects': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      get: {
        operationId: 'listProjects',
        responses: { '200': listResponse('#/components/schemas/Project'), ...commonErrors },
      },
      post: {
        operationId: 'createProject',
        requestBody: jsonBody('#/components/schemas/CreateProjectInput'),
        responses: { '201': dataResponse('#/components/schemas/Project'), ...commonErrors },
      },
    },
    '/projects/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      get: {
        operationId: 'getProject',
        responses: { '200': dataResponse('#/components/schemas/Project'), ...commonErrors },
      },
      patch: {
        operationId: 'updateProject',
        requestBody: jsonBody('#/components/schemas/UpdateProjectInput'),
        responses: { '200': dataResponse('#/components/schemas/Project'), ...commonErrors },
      },
      delete: {
        operationId: 'deleteProject',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/teams/{teamId}/cycles': {
      parameters: [{ $ref: '#/components/parameters/teamId' }],
      get: {
        operationId: 'listCycles',
        responses: { '200': listResponse('#/components/schemas/Cycle'), ...commonErrors },
      },
      post: {
        operationId: 'createCycle',
        requestBody: jsonBody('#/components/schemas/CreateCycleInput'),
        responses: { '201': dataResponse('#/components/schemas/Cycle'), ...commonErrors },
      },
    },
    '/cycles/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      get: {
        operationId: 'getCycle',
        responses: { '200': dataResponse('#/components/schemas/Cycle'), ...commonErrors },
      },
      patch: {
        operationId: 'updateCycle',
        requestBody: jsonBody('#/components/schemas/UpdateCycleInput'),
        responses: { '200': dataResponse('#/components/schemas/Cycle'), ...commonErrors },
      },
      delete: {
        operationId: 'deleteCycle',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/workspaces/{ws}/search': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      get: {
        operationId: 'search',
        summary: 'Search issues by identifier or title/description',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': listResponse('#/components/schemas/IssueWithRelations'),
          ...commonErrors,
        },
      },
    },
    '/notifications': {
      get: {
        operationId: 'listNotifications',
        parameters: [
          { name: 'unread', in: 'query', schema: { type: 'string', enum: ['1', 'true'] } },
        ],
        responses: {
          '200': listResponse('#/components/schemas/Notification'),
          ...commonErrors,
        },
      },
    },
    '/notifications/{id}/read': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      post: {
        operationId: 'markNotificationRead',
        responses: { '204': { description: 'Marked read' }, ...commonErrors },
      },
    },
    '/notifications/read-all': {
      post: {
        operationId: 'markAllNotificationsRead',
        responses: { '204': { description: 'Marked all read' }, ...commonErrors },
      },
    },
    '/workspaces/{ws}/api-keys': {
      parameters: [{ $ref: '#/components/parameters/ws' }],
      get: {
        operationId: 'listApiKeys',
        responses: { '200': listResponse('#/components/schemas/ApiKey'), ...commonErrors },
      },
      post: {
        operationId: 'createApiKey',
        summary: 'Create an API key (plaintext returned only here)',
        requestBody: jsonBody('#/components/schemas/CreateApiKeyInput'),
        responses: {
          '201': dataResponse('#/components/schemas/ApiKeyWithSecret'),
          ...commonErrors,
        },
      },
    },
    '/api-keys/{id}': {
      parameters: [{ $ref: '#/components/parameters/id' }],
      delete: {
        operationId: 'deleteApiKey',
        responses: { '204': { description: 'Deleted' }, ...commonErrors },
      },
    },
    '/ws': {
      get: {
        operationId: 'connectWebSocket',
        summary: 'WebSocket upgrade for realtime workspace events',
        parameters: [
          { name: 'workspace', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '101': { description: 'Switching Protocols' }, ...commonErrors },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApi',
        summary: 'This document',
        responses: { '200': { description: 'OpenAPI document' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'sk_*' },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
      },
    },
    parameters: {
      ws: { name: 'ws', in: 'path', required: true, schema: { type: 'string' } },
      teamId: { name: 'teamId', in: 'path', required: true, schema: { type: 'string' } },
      id: { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    },
    schemas: {
      ApiError: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      AuthMethods: {
        type: 'object',
        required: ['emailPassword', 'google'],
        properties: {
          emailPassword: { type: 'boolean' },
          google: { type: 'boolean' },
        },
      },
      PageInfo: {
        type: 'object',
        required: ['hasNextPage', 'nextCursor'],
        properties: {
          hasNextPage: { type: 'boolean' },
          nextCursor: { type: ['string', 'null'] },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          emailVerified: { type: 'boolean' },
          image: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserSummary: {
        type: 'object',
        required: ['id', 'name', 'email', 'image'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          image: { type: ['string', 'null'] },
        },
      },
      Workspace: {
        type: 'object',
        required: ['id', 'name', 'slug', 'createdAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkspaceMember: {
        type: 'object',
        required: ['id', 'workspaceId', 'userId', 'role', 'createdAt'],
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          userId: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'member'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkspaceMemberWithUser: {
        allOf: [
          { $ref: '#/components/schemas/WorkspaceMember' },
          {
            type: 'object',
            required: ['user'],
            properties: { user: { $ref: '#/components/schemas/UserSummary' } },
          },
        ],
      },
      WorkspaceDetail: {
        allOf: [
          { $ref: '#/components/schemas/Workspace' },
          {
            type: 'object',
            required: ['teams', 'members', 'labels'],
            properties: {
              teams: { type: 'array', items: { $ref: '#/components/schemas/Team' } },
              members: {
                type: 'array',
                items: { $ref: '#/components/schemas/WorkspaceMemberWithUser' },
              },
              labels: { type: 'array', items: { $ref: '#/components/schemas/Label' } },
            },
          },
        ],
      },
      Me: {
        type: 'object',
        required: ['user', 'workspaces'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          workspaces: { type: 'array', items: { $ref: '#/components/schemas/Workspace' } },
        },
      },
      Team: {
        type: 'object',
        required: ['id', 'workspaceId', 'name', 'key', 'color', 'icon', 'createdAt'],
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          color: { type: ['string', 'null'] },
          icon: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkflowState: {
        type: 'object',
        required: ['id', 'teamId', 'name', 'type', 'color', 'position'],
        properties: {
          id: { type: 'string' },
          teamId: { type: 'string' },
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['backlog', 'unstarted', 'started', 'completed', 'canceled'],
          },
          color: { type: 'string' },
          position: { type: 'number' },
        },
      },
      Label: {
        type: 'object',
        required: ['id', 'workspaceId', 'name', 'color'],
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string' },
        },
      },
      Project: {
        type: 'object',
        required: [
          'id', 'workspaceId', 'name', 'description', 'icon', 'color',
          'status', 'leadId', 'startDate', 'targetDate', 'sortOrder', 'createdAt',
        ],
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          icon: { type: ['string', 'null'] },
          color: { type: ['string', 'null'] },
          status: {
            type: 'string',
            enum: ['backlog', 'planned', 'started', 'paused', 'completed', 'canceled'],
          },
          leadId: { type: ['string', 'null'] },
          startDate: { type: ['string', 'null'], format: 'date-time' },
          targetDate: { type: ['string', 'null'], format: 'date-time' },
          sortOrder: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Cycle: {
        type: 'object',
        required: ['id', 'teamId', 'number', 'name', 'startsAt', 'endsAt', 'createdAt'],
        properties: {
          id: { type: 'string' },
          teamId: { type: 'string' },
          number: { type: 'integer' },
          name: { type: ['string', 'null'] },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Issue: {
        type: 'object',
        required: [
          'id', 'teamId', 'number', 'title', 'description', 'stateId',
          'priority', 'assigneeId', 'creatorId', 'parentId', 'projectId',
          'cycleId', 'estimate', 'sortOrder', 'dueDate', 'createdAt',
          'updatedAt', 'completedAt', 'canceledAt',
        ],
        properties: {
          id: { type: 'string' },
          teamId: { type: 'string' },
          number: { type: 'integer' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          stateId: { type: 'string' },
          priority: { type: 'integer', minimum: 0, maximum: 4 },
          assigneeId: { type: ['string', 'null'] },
          creatorId: { type: 'string' },
          parentId: { type: ['string', 'null'] },
          projectId: { type: ['string', 'null'] },
          cycleId: { type: ['string', 'null'] },
          estimate: { type: ['integer', 'null'] },
          sortOrder: { type: 'number' },
          dueDate: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: ['string', 'null'], format: 'date-time' },
          canceledAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      IssueWithRelations: {
        allOf: [
          { $ref: '#/components/schemas/Issue' },
          {
            type: 'object',
            required: ['labels', 'assignee', 'blockedBy'],
            properties: {
              labels: { type: 'array', items: { $ref: '#/components/schemas/Label' } },
              assignee: {
                oneOf: [
                  { $ref: '#/components/schemas/UserSummary' },
                  { type: 'null' },
                ],
              },
              blockedBy: {
                type: 'array',
                items: { $ref: '#/components/schemas/IssueBlockerRef' },
              },
            },
          },
        ],
      },
      IssueBlockerRef: {
        type: 'object',
        required: ['id', 'identifier', 'teamKey', 'number', 'title', 'state', 'stateName'],
        properties: {
          id: { type: 'string' },
          identifier: { type: 'string' },
          teamKey: { type: 'string' },
          number: { type: 'integer' },
          title: { type: 'string' },
          state: { $ref: '#/components/schemas/WorkflowState' },
          stateName: { type: 'string' },
        },
      },
      IssueUsage: {
        type: 'object',
        required: ['issueId', 'tokens', 'updatedAt'],
        properties: {
          issueId: { type: 'string' },
          tokens: { type: 'integer', minimum: 0 },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'issueId', 'authorId', 'body', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          issueId: { type: 'string' },
          authorId: { type: 'string' },
          body: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CommentWithAuthor: {
        allOf: [
          { $ref: '#/components/schemas/Comment' },
          {
            type: 'object',
            required: ['author'],
            properties: { author: { $ref: '#/components/schemas/UserSummary' } },
          },
        ],
      },
      IssueActivityWithActor: {
        type: 'object',
        required: ['id', 'issueId', 'actorId', 'type', 'data', 'createdAt', 'actor'],
        properties: {
          id: { type: 'string' },
          issueId: { type: 'string' },
          actorId: { type: 'string' },
          type: { type: 'string' },
          data: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          actor: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      IssueDetail: {
        allOf: [
          { $ref: '#/components/schemas/Issue' },
          {
            type: 'object',
            required: [
              'labels', 'assignee', 'blockedBy', 'creator', 'state',
              'comments', 'activities', 'subIssues',
            ],
            properties: {
              labels: { type: 'array', items: { $ref: '#/components/schemas/Label' } },
              assignee: {
                oneOf: [{ $ref: '#/components/schemas/UserSummary' }, { type: 'null' }],
              },
              blockedBy: {
                type: 'array',
                items: { $ref: '#/components/schemas/IssueBlockerRef' },
              },
              creator: { $ref: '#/components/schemas/UserSummary' },
              state: { $ref: '#/components/schemas/WorkflowState' },
              comments: { type: 'array', items: { $ref: '#/components/schemas/CommentWithAuthor' } },
              activities: { type: 'array', items: { $ref: '#/components/schemas/IssueActivityWithActor' } },
              subIssues: { type: 'array', items: { $ref: '#/components/schemas/Issue' } },
            },
          },
        ],
      },
      Notification: {
        type: 'object',
        required: ['id', 'userId', 'workspaceId', 'issueId', 'actorId', 'type', 'readAt', 'createdAt'],
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          workspaceId: { type: 'string' },
          issueId: { type: ['string', 'null'] },
          actorId: { type: ['string', 'null'] },
          type: { type: 'string', enum: ['assigned', 'comment', 'state_changed', 'mention'] },
          readAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object',
        required: ['id', 'userId', 'workspaceId', 'name', 'prefix', 'scopes', 'lastUsedAt', 'createdAt'],
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string' },
          prefix: { type: 'string' },
          scopes: {
            type: 'array',
            items: { $ref: '#/components/schemas/ApiKeyScope' },
          },
          lastUsedAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiKeyScope: {
        type: 'string',
        enum: [
          '*',
          'issues:read',
          'issues:write',
          'comments:read',
          'comments:write',
          'states:read',
          'states:write',
          'members:read',
          'members:write',
          'relations:read',
          'relations:write',
          'usage:write',
          'api_keys:write',
        ],
      },
      ApiKeyWithSecret: {
        allOf: [
          { $ref: '#/components/schemas/ApiKey' },
          {
            type: 'object',
            required: ['key'],
            properties: { key: { type: 'string', description: 'Plaintext key, shown once' } },
          },
        ],
      },
      CreateWorkspaceInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', minLength: 1 },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        },
      },
      InviteMemberInput: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'member'] },
        },
      },
      CreateTeamInput: {
        type: 'object',
        required: ['name', 'key'],
        properties: {
          name: { type: 'string', minLength: 1 },
          key: { type: 'string', pattern: '^[A-Z0-9]+$', maxLength: 6 },
          color: { type: 'string' },
          icon: { type: 'string' },
        },
      },
      UpdateTeamInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          key: { type: 'string', pattern: '^[A-Z0-9]+$' },
          color: { type: ['string', 'null'] },
          icon: { type: ['string', 'null'] },
        },
      },
      CreateStateInput: {
        type: 'object',
        required: ['name', 'type', 'color'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['backlog', 'unstarted', 'started', 'completed', 'canceled'] },
          color: { type: 'string' },
          position: { type: 'number' },
        },
      },
      UpdateStateInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['backlog', 'unstarted', 'started', 'completed', 'canceled'] },
          color: { type: 'string' },
          position: { type: 'number' },
        },
      },
      CreateIssueInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: ['string', 'null'] },
          stateId: { type: 'string' },
          priority: { type: 'integer', minimum: 0, maximum: 4 },
          assigneeId: { type: ['string', 'null'] },
          labelIds: { type: 'array', items: { type: 'string' } },
          parentId: { type: ['string', 'null'] },
          projectId: { type: ['string', 'null'] },
          cycleId: { type: ['string', 'null'] },
          estimate: { type: ['integer', 'null'] },
          sortOrder: { type: 'number' },
          dueDate: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      UpdateIssueInput: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: ['string', 'null'] },
          stateId: { type: 'string' },
          priority: { type: 'integer', minimum: 0, maximum: 4 },
          assigneeId: { type: ['string', 'null'] },
          parentId: { type: ['string', 'null'] },
          projectId: { type: ['string', 'null'] },
          cycleId: { type: ['string', 'null'] },
          estimate: { type: ['integer', 'null'] },
          sortOrder: { type: 'number' },
          dueDate: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      IssueBatchInput: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: 'array', maxItems: 200, items: { type: 'string' } },
        },
      },
      CreateCommentInput: {
        type: 'object',
        required: ['body'],
        properties: { body: { type: 'string', minLength: 1 } },
      },
      UpdateCommentInput: {
        type: 'object',
        required: ['body'],
        properties: { body: { type: 'string', minLength: 1 } },
      },
      CreateLabelInput: {
        type: 'object',
        required: ['name', 'color'],
        properties: {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 },
        },
      },
      UpdateLabelInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          color: { type: 'string' },
        },
      },
      AddIssueLabelInput: {
        type: 'object',
        required: ['labelId'],
        properties: { labelId: { type: 'string' } },
      },
      AddIssueBlockerInput: {
        type: 'object',
        required: ['blockerIssueId'],
        properties: { blockerIssueId: { type: 'string' } },
      },
      AddIssueUsageInput: {
        type: 'object',
        required: ['tokens'],
        properties: { tokens: { type: 'integer', minimum: 1 } },
      },
      CreateProjectInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: ['string', 'null'] },
          icon: { type: ['string', 'null'] },
          color: { type: ['string', 'null'] },
          status: {
            type: 'string',
            enum: ['backlog', 'planned', 'started', 'paused', 'completed', 'canceled'],
          },
          leadId: { type: ['string', 'null'] },
          startDate: { type: ['string', 'null'], format: 'date-time' },
          targetDate: { type: ['string', 'null'], format: 'date-time' },
          sortOrder: { type: 'number' },
        },
      },
      UpdateProjectInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          icon: { type: ['string', 'null'] },
          color: { type: ['string', 'null'] },
          status: {
            type: 'string',
            enum: ['backlog', 'planned', 'started', 'paused', 'completed', 'canceled'],
          },
          leadId: { type: ['string', 'null'] },
          startDate: { type: ['string', 'null'], format: 'date-time' },
          targetDate: { type: ['string', 'null'], format: 'date-time' },
          sortOrder: { type: 'number' },
        },
      },
      CreateCycleInput: {
        type: 'object',
        required: ['startsAt', 'endsAt'],
        properties: {
          name: { type: ['string', 'null'] },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateCycleInput: {
        type: 'object',
        properties: {
          name: { type: ['string', 'null'] },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateApiKeyInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          scopes: {
            type: 'array',
            items: { $ref: '#/components/schemas/ApiKeyScope' },
          },
        },
      },
    },
  },
} as const;
