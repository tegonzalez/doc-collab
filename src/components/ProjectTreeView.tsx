"use client";

import React, { useState, useRef, useEffect } from "react";
// Removed DataHandler, TreeProps imports
import { Tree, NodeRendererProps, TreeApi, NodeApi } from "react-arborist"; 
import { Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isPending?: boolean;
}

const initialTreeData: TreeNode[] = [
  { id: "root", name: "Projects", children: [] },
];

// --- Node Renderer ---
function Node({ node, style, dragHandle, tree }: NodeRendererProps<TreeNode>) {
  const isRoot = node.id === "root";
  const isPending = node.data.isPending;

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isRoot && tree) {
      // Call create - this triggers onCreate internally
      // tree.create returns Promise<void>, so we can't get the new node data directly here.
      // The editing logic after creation needs to be re-evaluated.
      // For now, just call create.
      tree.create({ parentId: node.id });
      // Removed the problematic logic that tried to access .id from the Promise
      // and the subsequent setTimeout for editing.
    }
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isRoot && !isPending && !node.isEditing) {
      node.edit();
    }
  };

  return (
    <div
      ref={dragHandle}
      style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: '8px',
          cursor: 'pointer',
          lineHeight: '36px',
       }}
      className={`
        ${isPending ? 'italic opacity-60' : ''}
        hover:bg-gray-100
        ${node.state.isSelected ? "bg-blue-100" : ""}
      `}
      onClick={(e) => {
         e.stopPropagation();
         if (node.isInternal) node.toggle();
      }}
    >
      <span style={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
         {node.isLeaf ? "📄" : node.isOpen ? "📂" : "📁"} {node.data.name}
      </span>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {isRoot && (
           <button
               onClick={handleAddClick}
               title="Add Project"
               className="p-1 hover:bg-gray-200 rounded opacity-70 hover:opacity-100"
           >
               <Plus size={16} />
           </button>
        )}
        <button
          onClick={handleEditClick}
          disabled={isRoot || isPending}
          title={isRoot ? "Cannot edit root" : isPending ? "Pending creation" : "Edit"}
          className={`p-1 hover:bg-gray-200 rounded opacity-70 hover:opacity-100 ${isRoot || isPending ? 'cursor-not-allowed opacity-30' : ''}`}
        >
          <Edit size={16} />
        </button>
      </div>
    </div>
  );
}


// --- Tree View Component ---
export function ProjectTreeView() {
  const { toast } = useToast();
  const [data, setData] = useState<TreeNode[]>(initialTreeData);
  const treeRef = useRef<TreeApi<TreeNode>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(400);

  useEffect(() => {
    const currentContainerRef = containerRef.current;
    const measureHeight = () => { if (currentContainerRef) setContainerHeight(currentContainerRef.clientHeight); };
    measureHeight();
    const resizeObserver = new ResizeObserver(measureHeight);
    if (currentContainerRef) resizeObserver.observe(currentContainerRef);
    return () => {
        if (currentContainerRef) resizeObserver.unobserve(currentContainerRef);
        resizeObserver.disconnect();
    };
  }, []);

  // --- Data Handlers ---

  // onCreate remains the same, returning the new node structure
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onCreate = ({ parentId: _parentId, index: _index, type: _type }: { parentId: string | null; index: number; type: "internal" | "leaf" }): TreeNode => {
    console.log("onCreate called");
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return {
        id: newId,
        name: "Untitled",
        children: []
    };
  };

  // Moved validation logic from handleDisableRename into onRename
  const onRename = ({ id, name, node }: { id: string; name: string; node: NodeApi<TreeNode> }): void => {
      // *** Start Validation Logic (moved from handleDisableRename) ***
      const parent = node.parent; // Access parent node
      if (!parent) {
          console.error("Cannot rename node without a parent (should be root, but rename disabled)");
          return; // Should not happen for non-root nodes typically
      }
      const siblings = parent.children ?? [];
      const trimmedName = name.trim();

      if (trimmedName === "") {
          toast({ title: "Invalid Name", description: "Project name cannot be empty.", variant: "destructive" });
          node.reset(); // Cancel the rename in the UI
          return;
      }
      const invalidCharRegex = /[^a-zA-Z0-9_-\s]/;
      if (invalidCharRegex.test(trimmedName)) {
          toast({ title: "Invalid Name", description: "Name contains invalid characters. Allowed: letters, numbers, spaces, underscore, hyphen.", variant: "destructive" });
          node.reset(); // Cancel the rename in the UI
          return;
      }
      const isDuplicate = siblings.some(sibling =>
          sibling.id !== node.id && sibling.data.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
          toast({ title: "Invalid Name", description: `A project named "${trimmedName}" already exists.`, variant: "destructive" });
          node.reset(); // Cancel the rename in the UI
          return;
      }
      // *** End Validation Logic ***

      console.log(`onRename VALID & SUCCESS: Node ${id} renamed to ${trimmedName}`);
      // Update the data state directly
      setData(currentData => {
          const findAndUpdate = (nodes: TreeNode[]): TreeNode[] => {
              return nodes.map(n => {
                  if (n.id === id) {
                      // Use trimmedName and clear pending status
                      return { ...n, name: trimmedName, isPending: undefined }; 
                  } else if (n.children) {
                      return { ...n, children: findAndUpdate(n.children) };
                  } else {
                      return n;
                  }
              });
          };
          return findAndUpdate(currentData);
      });
  };

   return (
    <div ref={containerRef} className="w-full border rounded overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Removed disableRename prop */}
      <Tree<TreeNode>
        ref={treeRef}
        data={data}
        onCreate={onCreate}
        onRename={onRename} // onRename now includes validation
        // Removed disableRename prop
        width="100%"
        height={containerHeight}
        openByDefault={true}
        indent={24}
        rowHeight={36}
        paddingTop={10}
        paddingBottom={10}
        disableEdit={false} // Allows editing (renaming)
      >
          {(props) => <Node {...props} />}
      </Tree>
    </div>
  );
}

export default ProjectTreeView;
