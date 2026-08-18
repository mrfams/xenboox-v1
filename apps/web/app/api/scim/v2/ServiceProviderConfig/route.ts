/**
 * SCIM 2.0 ServiceProviderConfig — Advertises supported SCIM features.
 *
 * Reference: RFC 7644 §4
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    patch: {
      supported: true,
    },
    bulk: {
      supported: false,
      maxOperations: 0,
      maxPayloadSize: 0,
    },
    filter: {
      supported: true,
      maxResults: 100,
    },
    changePassword: {
      supported: false,
    },
    sort: {
      supported: false,
    },
    etag: {
      supported: false,
    },
    meta: {
      resourceType: "ServiceProviderConfig",
      location: "/api/scim/v2/ServiceProviderConfig",
    },
  });
}
