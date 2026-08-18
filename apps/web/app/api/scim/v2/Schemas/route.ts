/**
 * SCIM 2.0 Schemas — Lists supported schemas.
 *
 * Reference: RFC 7644 §7
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: 2,
    startIndex: 1,
    itemsPerPage: 2,
    Resources: [
      {
        id: "urn:ietf:params:scim:schemas:core:2.0:User",
        name: "User",
        description: "Core User schema",
        attributes: [
          {
            name: "userName",
            type: "string",
            required: true,
            mutability: "readWrite",
          },
          {
            name: "name",
            type: "complex",
            required: false,
            mutability: "readWrite",
          },
          {
            name: "displayName",
            type: "string",
            required: false,
            mutability: "readWrite",
          },
          {
            name: "emails",
            type: "complex",
            multiValued: true,
            required: false,
            mutability: "readWrite",
          },
          {
            name: "active",
            type: "boolean",
            required: false,
            mutability: "readWrite",
          },
        ],
      },
      {
        id: "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
        name: "EnterpriseUser",
        description: "Enterprise User extension",
        attributes: [
          {
            name: "organization",
            type: "string",
            required: false,
            mutability: "readWrite",
          },
          {
            name: "costCenter",
            type: "string",
            required: false,
            mutability: "readWrite",
          },
        ],
      },
    ],
  });
}
