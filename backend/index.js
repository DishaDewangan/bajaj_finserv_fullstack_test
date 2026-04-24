require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const EDGE_REGEX = /^[A-Z]->[A-Z]$/;

function normalizeEdge(entry) {
  if (typeof entry !== "string") {
    return { valid: false, normalized: String(entry ?? "") };
  }

  const normalized = entry.trim();
  if (!normalized || !EDGE_REGEX.test(normalized)) {
    return { valid: false, normalized };
  }

  const [parent, child] = normalized.split("->");
  if (parent === child) {
    return { valid: false, normalized };
  }

  return { valid: true, normalized, parent, child };
}

function getOrCreateSet(map, key) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  return map.get(key);
}

function buildGroupData(nodes, adjacency, parentMap) {
  const undirected = new Map();

  for (const node of nodes) {
    undirected.set(node, new Set());
  }

  for (const [from, children] of adjacency.entries()) {
    for (const to of children) {
      undirected.get(from).add(to);
      undirected.get(to).add(from);
    }
  }

  const visited = new Set();
  const groups = [];

  for (const node of nodes) {
    if (visited.has(node)) continue;

    const stack = [node];
    const groupNodes = new Set();
    visited.add(node);

    while (stack.length) {
      const current = stack.pop();
      groupNodes.add(current);
      for (const neighbor of undirected.get(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    groups.push(groupNodes);
  }

  return groups.map((groupNodes) => {
    const groupAdj = new Map();
    const childNodes = new Set();

    for (const node of groupNodes) {
      groupAdj.set(node, []);
    }

    for (const node of groupNodes) {
      const children = adjacency.get(node) || new Set();
      for (const child of children) {
        if (groupNodes.has(child)) {
          groupAdj.get(node).push(child);
          childNodes.add(child);
        }
      }
    }

    const roots = [...groupNodes]
      .filter((n) => !childNodes.has(n))
      .sort((a, b) => a.localeCompare(b));

    const fallbackRoot = [...groupNodes].sort((a, b) => a.localeCompare(b))[0];
    const root = roots[0] || fallbackRoot;

    return { nodes: groupNodes, adjacency: groupAdj, root, parentMap };
  });
}

function hasCycle(adjacency, nodes) {
  const visiting = new Set();
  const visited = new Set();

  function dfs(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    const children = adjacency.get(node) || [];
    for (const child of children) {
      if (dfs(child)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }

  return false;
}

function buildTree(root, adjacency) {
  const children = [...(adjacency.get(root) || [])].sort((a, b) =>
    a.localeCompare(b)
  );
  const subtree = {};

  for (const child of children) {
    subtree[child] = buildTree(child, adjacency);
  }

  return subtree;
}

function calculateDepth(root, adjacency) {
  const children = adjacency.get(root) || [];
  if (!children.length) return 1;

  let maxChildDepth = 0;
  for (const child of children) {
    maxChildDepth = Math.max(maxChildDepth, calculateDepth(child, adjacency));
  }

  return 1 + maxChildDepth;
}

function processData(input) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const duplicateSeen = new Set();
  const validEdges = [];
  const uniqueEdgeSet = new Set();
  const childParent = new Map();

  for (const rawEntry of input) {
    const parsed = normalizeEdge(rawEntry);
    if (!parsed.valid) {
      invalidEntries.push(parsed.normalized);
      continue;
    }

    const edgeKey = parsed.normalized;
    if (uniqueEdgeSet.has(edgeKey)) {
      if (!duplicateSeen.has(edgeKey)) {
        duplicateEdges.push(edgeKey);
        duplicateSeen.add(edgeKey);
      }
      continue;
    }

    uniqueEdgeSet.add(edgeKey);

    if (childParent.has(parsed.child)) {
      continue;
    }

    childParent.set(parsed.child, parsed.parent);
    validEdges.push(parsed);
  }

  const nodes = new Set();
  const adjacency = new Map();

  for (const edge of validEdges) {
    nodes.add(edge.parent);
    nodes.add(edge.child);
    getOrCreateSet(adjacency, edge.parent).add(edge.child);
    getOrCreateSet(adjacency, edge.child);
  }

  const groups = buildGroupData(nodes, adjacency, childParent);
  const hierarchies = [];

  for (const group of groups) {
    const cyclic = hasCycle(group.adjacency, group.nodes);
    if (cyclic) {
      hierarchies.push({
        root: group.root,
        tree: {},
        has_cycle: true,
      });
      continue;
    }

    const tree = { [group.root]: buildTree(group.root, group.adjacency) };
    const depth = calculateDepth(group.root, group.adjacency);
    hierarchies.push({
      root: group.root,
      tree,
      depth,
    });
  }

  const nonCyclic = hierarchies.filter((item) => !item.has_cycle);
  const cyclicCount = hierarchies.length - nonCyclic.length;

  let largestTreeRoot = "";
  if (nonCyclic.length) {
    const sorted = [...nonCyclic].sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root.localeCompare(b.root);
    });
    largestTreeRoot = sorted[0].root;
  }

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclicCount,
      largest_tree_root: largestTreeRoot,
    },
  };
}

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "BFHL API is running" });
});

app.post("/bfhl", (req, res) => {
  const { data } = req.body || {};
  if (!Array.isArray(data)) {
    return res.status(400).json({
      error: "Invalid request body. Expected { data: string[] }",
    });
  }

  const result = processData(data);

  return res.status(200).json({
    user_id: process.env.USER_ID || "yourname_ddmmyyyy",
    email_id: process.env.EMAIL_ID || "your.college.email@example.com",
    college_roll_number: process.env.COLLEGE_ROLL_NUMBER || "YOURROLLNUMBER",
    ...result,
  });
});

app.listen(PORT, () => {
  console.log(`BFHL API running on port ${PORT}`);
});
