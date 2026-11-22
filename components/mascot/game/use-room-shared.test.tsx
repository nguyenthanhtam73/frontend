import assert from "node:assert/strict";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { RoomQuestCard } from "@/components/mascot/game/be-da-room-shared";
import { useRoomShared, type RoomTogether } from "@/components/mascot/game/use-room-shared";
import vi from "../../../messages/vi.json";

const reactGlobals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
reactGlobals.IS_REACT_ACT_ENVIRONMENT = true;

describe("useRoomShared", () => {
  it("marks every unclaimed chest Hết hạn when GET /quest returns 409 room_ended", async () => {
    const host = mountPoint();
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.equal(url.includes("/mascot/rooms/DA7K2M/quest") || url.includes("/mascot/rooms/DA7K2M/today"), true);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "room_ended", message: "Phòng này đã kết thúc." },
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    let latest: RoomTogether | null = null;
    const root = createRoot(host as unknown as HTMLElement);
    try {
      await act(async () => {
        root.render(
          createElement(function Probe() {
            latest = useRoomShared("DA7K2M", true, null);
            return null;
          }),
        );
        for (let i = 0; i < 10; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      });

      assert.ok(latest);
      const room = latest as RoomTogether;
      assert.equal(room.loading, false);
      assert.equal(room.expired, true);
      assert.equal(room.visible, true);
      assert.deepEqual(
        room.chests.map((chest) => chest.memberDays),
        [5, 15, 30],
      );
      assert.equal(
        room.chests.every((chest) => chest.state === "expired"),
        true,
      );
      assert.equal(
        room.chests.some((chest) => chest.state === "claimable"),
        false,
      );

      room.onClaim(5);
      assert.equal(room.claiming, null);
      assert.equal(room.chests.every((chest) => chest.state === "expired"), true);

      const html = renderToStaticMarkup(
        <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
          <RoomQuestCard together={room} locale="vi" />
        </NextIntlClientProvider>,
      );
      assert.equal((html.match(/Hết hạn/g) ?? []).length, 3);
      assert.equal(html.includes('data-state="claimable"'), false);
      assert.equal(html.includes(">Mở<"), false);
      assert.match(html, /disabled/);
    } finally {
      await act(async () => {
        root.unmount();
      });
      globalThis.fetch = previousFetch;
    }
  });
});

function mountPoint(): DomNode {
  const doc = documentNode();
  const globals = globalThis as typeof globalThis & {
    document: Document;
    window: Window & typeof globalThis;
    HTMLElement: typeof HTMLElement;
    Element: typeof Element;
    Node: typeof Node;
    HTMLIFrameElement: typeof HTMLIFrameElement;
  };
  globals.document = doc as unknown as Document;
  globals.window = globalThis as Window & typeof globalThis;
  globals.HTMLElement = class HTMLElement {} as unknown as typeof HTMLElement;
  globals.Element = class Element {} as unknown as typeof Element;
  globals.Node = class Node {} as unknown as typeof Node;
  globals.HTMLIFrameElement = class HTMLIFrameElement {} as unknown as typeof HTMLIFrameElement;
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  return host;
}

type DomNode = {
  nodeType: number;
  nodeName: string;
  tagName?: string;
  ownerDocument: DomDoc | null;
  parentNode: DomNode | null;
  childNodes: DomNode[];
  firstChild: DomNode | null;
  lastChild: DomNode | null;
  textContent: string;
  style: Record<string, string>;
  namespaceURI: string;
  appendChild: (child: DomNode) => DomNode;
  removeChild: (child: DomNode) => DomNode;
  insertBefore: (child: DomNode) => DomNode;
  contains: () => boolean;
  addEventListener: () => void;
  removeEventListener: () => void;
  setAttribute: () => void;
  removeAttribute: () => void;
  getAttribute: () => null;
  hasAttribute: () => boolean;
  focus: () => void;
};

type DomDoc = {
  nodeType: number;
  nodeName: string;
  activeElement: DomNode | null;
  documentElement: DomNode;
  body: DomNode;
  defaultView: typeof globalThis;
  createElement: (name: string) => DomNode;
  createElementNS: (ns: string, name: string) => DomNode;
  createTextNode: (text: string) => DomNode;
  addEventListener: () => void;
  removeEventListener: () => void;
};

function element(doc: DomDoc, name: string): DomNode {
  const el: DomNode = {
    nodeType: 1,
    nodeName: name.toUpperCase(),
    tagName: name.toUpperCase(),
    ownerDocument: doc,
    parentNode: null,
    childNodes: [],
    firstChild: null,
    lastChild: null,
    textContent: "",
    style: {},
    namespaceURI: "http://www.w3.org/1999/xhtml",
    appendChild(child) {
      child.parentNode = el;
      el.childNodes.push(child);
      el.firstChild = el.childNodes[0] ?? null;
      el.lastChild = child;
      return child;
    },
    removeChild(child) {
      el.childNodes = el.childNodes.filter((item) => item !== child);
      el.firstChild = el.childNodes[0] ?? null;
      el.lastChild = el.childNodes.at(-1) ?? null;
      return child;
    },
    insertBefore(child) {
      return el.appendChild(child);
    },
    contains: () => false,
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute: () => null,
    hasAttribute: () => false,
    focus() {},
  };
  return el;
}

function documentNode(): DomDoc {
  const doc = {
    nodeType: 9,
    nodeName: "#document",
    activeElement: null,
    documentElement: null,
    body: null,
    defaultView: globalThis,
    createElement(name: string) {
      return element(doc, name);
    },
    createElementNS(_ns: string, name: string) {
      return doc.createElement(name);
    },
    createTextNode(text: string): DomNode {
      return {
        ...element(doc, "#text"),
        nodeType: 3,
        nodeName: "#text",
        textContent: String(text),
      };
    },
    addEventListener() {},
    removeEventListener() {},
  } as unknown as DomDoc;
  const html = element(doc, "html");
  const body = element(doc, "body");
  html.appendChild(body);
  doc.documentElement = html;
  doc.body = body;
  doc.activeElement = body;
  return doc;
}
