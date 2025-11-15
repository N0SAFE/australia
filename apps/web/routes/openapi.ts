import {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi'
import * as yaml from 'yaml'
import * as fs from 'fs'

import * as ApiCapsules from "../app/api/capsules/route.info";

import * as ApiUsers from "../app/api/users/route.info";

import * as ApiHealth from "../app/api/health/route.info";

import * as ApiCapsulesMonth from "../app/api/capsules/month/route.info";

import * as ApiCapsulesId from "../app/api/capsules/[id]/route.info";

import * as ApiUsersLogin from "../app/api/users/login/route.info";

import * as ApiUsersId from "../app/api/users/[id]/route.info";

import * as ApiUsersMe from "../app/api/users/me/route.info";

import * as ApiCapsulesDayDay from "../app/api/capsules/day/[day]/route.info";


const registry = new OpenAPIRegistry()

registry.registerPath({
  method: "get",
  path: "/api/capsules",
  summary: "",
  request: {
  params: ApiCapsules.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiCapsules.GET.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/api/users",
  summary: "",
  request: {
  params: ApiUsers.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiUsers.GET.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "",
  request: {
  params: ApiHealth.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiHealth.GET.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/api/capsules/month",
  summary: "",
  request: {
  params: ApiCapsulesMonth.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiCapsulesMonth.GET.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/api/capsules/{id}",
  summary: "",
  request: {
  params: ApiCapsulesId.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiCapsulesId.GET.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "post",
  path: "/api/users/login",
  summary: "",
  request: {
  params: ApiUsersLogin.Route.params,
  body: {
      required: true,
      content: {
        "application/json": {
          schema: ApiUsersLogin.POST.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiUsersLogin.POST.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/api/users/{id}",
  summary: "",
  request: {
  params: ApiUsersId.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiUsersId.GET.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "post",
  path: "/api/users/me",
  summary: "",
  request: {
  params: ApiUsersMe.Route.params,
  body: {
      required: true,
      content: {
        "application/json": {
          schema: ApiUsersMe.POST.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiUsersMe.POST.result,
        },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/api/capsules/day/{day}",
  summary: "",
  request: {
  params: ApiCapsulesDayDay.Route.params,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: ApiCapsulesDayDay.GET.result,
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions)
const docs = generator.generateDocument({
    openapi: '3.0.0',
    info: {
        version: '1.0.0',
        title: 'My API',
        description: 'This is the API',
    },
    servers: [{ url: 'v1' }],
})

fs.writeFileSync(`./openapi-docs.yml`, yaml.stringify(docs), {
    encoding: 'utf-8',
})
