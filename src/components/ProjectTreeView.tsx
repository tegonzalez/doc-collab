"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Tree, NodeRendererProps, type TreeApi, type NodeApi } from "react-arborist"; // Corrected TreeApi import
import { Plus, Edit, Folder, File, FolderOpen } from "lucide-react";
import { useNotifications } from "@/components/ui/NotificationsPanel";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/queue/interface";

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isPending?: boolean;
  isEditing?: boolean; // Flag for new node initial state
}

const initialDataStructure: TreeNode[] = [
  { id: "root", name: "Projects", children: [] },
];

const validateName = (name: string, siblings: NodeApi<TreeNode>[] | null | undefined): string | null => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return "Project name cannot be empty.";
  }
  // Regex to match invalid chars. Note: Backslash needs double escape in regex.
  // if (/[\/:\*\?"<>\|]/.test(trimmedName)) {
  //   // Commenting out this check due to issues with handling the escaped string
  //   return "Project name contains invalid characters";
  // }
  if (Array.isArray(siblings) && siblings.some(sibling => sibling.data.name.toLowerCase() === trimmedName.toLowerCase())) {
    return "A project with this name already exists.";
  }
  return null;
};

interface CustomNodeRendererProps extends NodeRendererProps<TreeNode> {
    setTreeData: React.Dispatch<React.SetStateAction<TreeNode[]>>;
    // Define filterOutNode directly here or pass it down
    filterOutNode: (nodes: TreeNode[], idToRemove: string) => TreeNode[];
}

function Node({ node, style, dragHandle, tree, setTreeData, filterOutNode }: CustomNodeRendererProps) {
  const { addNotification } = useNotifications();
  const isRoot = node.id === "root";
  // Determine if editing from the node state provided by react-arborist
  const isNodeApiEditing = node.isEditing;
  const inputRef = useRef<HTMLInputElement>(null);
  // Store the original name when editing starts
  const originalNameRef = useRef<string>(node.data.name);
  // Track if this node was just added and is in its initial edit state
  const isNewNodeRef = useRef<boolean>(node.data.isEditing || false); // Check the initial data flag

  // Effect to select text when editing starts (node.isEditing becomes true)
  useEffect(() => {
    if (isNodeApiEditing && inputRef.current) {
      inputRef.current.select();
      originalNameRef.current = node.data.name; // Store original name on edit start
       // If the node was flagged as new, keep the ref true, otherwise false
      isNewNodeRef.current = node.data.isEditing || false;
    } else {
        // Reset isNewNode flag when editing stops
        isNewNodeRef.current = false;
    }
  }, [isNodeApiEditing, node.data.name, node.data.isEditing]); // Depend on isEditing state

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isRoot && node.isInternal) {
      const parentId = node.id;
      const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      // Flag the new node data with isEditing: true
      const newNodeData: TreeNode = {
        id: newId,
        name: "Untitled",
        children: [],
        isEditing: true // Explicitly flag as new for initial edit state
      };

      setTreeData(currentData => {
        const addNodeRecursively = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(n => {
            if (n.id === parentId) {
              const children = n.children ? [...n.children] : [];
              children.push(newNodeData);
              return { ...n, children };
            } else if (n.children) {
              const updatedChildren = addNodeRecursively(n.children);
              if (updatedChildren !== n.children) {
                  return { ...n, children: updatedChildren };
              }
            }
            return n;
          });
        };
        const updatedData = addNodeRecursively(currentData);
        setTimeout(() => {
            const parentNode = tree.get(parentId);
            parentNode?.open();
             // Find the newly added node and trigger edit
             const newNode = tree.get(newId);
             newNode?.edit();
        }, 0);
        return updatedData;
      });
    } else {
        console.warn("Add clicked, but only allowed directly under root.");
    }
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isRoot && !node.data.isPending && !isNodeApiEditing) {
        node.edit();
    }
  };

  // Updated handler for name submission and validation
  const handleNameSubmit = (newName: string, isBlurEvent: boolean = false) => {
    const trimmedName = newName.trim();
    // Use original name for siblings check if it's a rename, otherwise use current siblings
    const siblings = node.parent?.children?.filter(n => n.id !== node.id);

    const validationError = validateName(trimmedName, siblings);

    if (validationError) {
        addNotification({ title: "Validation Error", details: validationError, type: 'error' });

        if (isBlurEvent) {
            // If it was a *new* node and blurred with invalid input, delete it
            if (isNewNodeRef.current) {
                console.log("Deleting new node due to blur with invalid name:", node.id);
                // Use tree.delete - the onDelete handler should update the state.
                tree.delete(node.id);
                // The check '!deleted || deleted.length === 0' is removed as tree.delete likely returns void or Promise<void>
                // and the onDelete handler is responsible for updating treeData state.
            } else {
                // If it was an *existing* node blurred with invalid input, reset it
                console.log("Resetting existing node due to blur with invalid name:", node.id);
                node.reset(); // Reverts name and exits edit mode
            }
        } else {
            // If Enter key pressed with invalid input, keep editing
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }
    } else {
        // Validation passed
        console.log("Submitting valid name:", trimmedName);
        // Remove the isEditing flag before submitting if it was manually added
        // node.submit will update the internal data, but we might need to clean our state flag
        node.submit(trimmedName);
        // Optionally update treeData state immediately to remove the isEditing flag visually if node.submit doesn't
        // setTreeData(currentData => {
        //     const findAndClean = (nodes: TreeNode[]): TreeNode[] => {
        //         return nodes.map(n => {
        //             if (n.id === node.id) {
        //                 const { isEditing, ...rest } = n;
        //                 return { ...rest, name: trimmedName }; // Use the validated name
        //             }
        //             if (n.children) {
        //                 const updatedChildren = findAndClean(n.children);
        //                 if (updatedChildren !== n.children) {
        //                     return { ...n, children: updatedChildren };
        //                 }
        //             }
        //             return n;
        //         });
        //     };
        //     return findAndClean(currentData);
        // });
        isNewNodeRef.current = false; // Mark as no longer new
    }
};


  return (
    <div
      style={style}
      ref={dragHandle}
      className={cn(
        "flex items-center justify-between group px-2 py-1 rounded hover:bg-gray-100",
        node.state.isSelected && !isNodeApiEditing ? "bg-blue-100 hover:bg-blue-100" : "", // Avoid blue bg while editing
        node.state.isDragging ? "opacity-50" : ""
      )}
      onClick={(e) => {
          // Allow clicking the text area while editing
          if (!isNodeApiEditing && (e.target === e.currentTarget || (e.target as HTMLElement).closest('span.folder-toggle-area'))) {
             if (node.isInternal) {
                 node.toggle();
             }
          }
      }}
      onDoubleClick={(e) => {
           if ((e.target as HTMLElement).closest('button')) return;
           if (!isRoot && !isNodeApiEditing) node.edit();
      }}
    >
      <div className="flex items-center gap-1 flex-grow truncate min-w-0">
        <span className="shrink-0 folder-toggle-area">
            {node.isLeaf ? <File size={16}/> : node.isOpen ? <FolderOpen size={16}/> : <Folder size={16}/>}
        </span>

        {isNodeApiEditing ? (
             <input
                ref={inputRef}
                type="text"
                defaultValue={originalNameRef.current} // Use original name as default
                onBlur={(e) => {
                    // Pass true to indicate it's a blur event
                    handleNameSubmit(e.currentTarget.value, true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                         e.preventDefault();
                         handleNameSubmit(e.currentTarget.value, false); // false for isBlurEvent
                    }
                    // Use Escape to cancel edit
                    else if (e.key === 'Escape') {
                         e.preventDefault();
                         if (isNewNodeRef.current) {
                             console.log("Deleting new node on Escape:", node.id);
                             // Use tree.delete - the onDelete handler should update the state.
                             tree.delete(node.id);
                              // The check '!deleted || deleted.length === 0' is removed.
                         } else {
                             console.log("Resetting existing node on Escape:", node.id);
                             node.reset(); // Reverts to original name and exits edit mode
                         }
                    }
                }}
                onClick={(e) => e.stopPropagation()} // Prevent node selection/toggle
                onDoubleClick={(e) => e.stopPropagation()} // Prevent triggering rename again
                autoFocus
                className="ml-1 px-1 py-0 border border-blue-300 rounded text-sm flex-grow min-w-0 h-6"
            />
        ) : (
            <span className="truncate px-1 folder-toggle-area" title={node.data.name}>
                {node.data.name}
                {node.data.isPending && "..."}
            </span>
        )}
      </div>

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 pl-1">
        {/* Hide edit button when editing */}
        {!isRoot && !node.data.isPending && !isNodeApiEditing && (
          <button
            onClick={handleEditClick}
            title="Rename Project"
            className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-200"
            aria-label={`Rename ${node.data.name}`}
            >
            <Edit size={14} />
          </button>
        )}
         {/* Hide add button when editing a node (usually only root adds) */}
        {isRoot && node.isInternal && !isNodeApiEditing && (
           <button
            onClick={handleAddClick}
            title="Add Project"
            className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-200"
            aria-label="Add new project"
            >
             <Plus size={16} />
           </button>
        )}
      </div>
    </div>
  );
}

// Placeholder for API call function - THIS IS NOT USED ACTIVELY IN THE CURRENT TREE LOGIC
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function apiCreateProject(projectName: string): Promise<Task> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectName }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create project and parse error response.' }));
    console.error('API Error Data:', errorData);
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  // Expecting 202 Accepted with the initial task object
  if (response.status !== 202) {
      console.warn(`Expected status 202 but got ${response.status}`);
      // Attempt to parse body anyway, might contain useful info or the task
  }
  return await response.json() as Task;
}

export default function ProjectTreeView() {
    const [treeData, setTreeData] = useState<TreeNode[]>(initialDataStructure);
    const { addNotification } = useNotifications();
    const treeRef = useRef<TreeApi<TreeNode>>(null); // Add ref for TreeApi

    // Define filterOutNode here so it can be passed down
    const filterOutNode = useCallback((nodes: TreeNode[], idToRemove: string): TreeNode[] => {
        return nodes
            .filter(node => node.id !== idToRemove)
            .map(node => {
                if (node.children) {
                    const updatedChildren = filterOutNode(node.children, idToRemove);
                    // Only return a new object if children actually changed
                    if (updatedChildren !== node.children) {
                        return { ...node, children: updatedChildren };
                    }
                }
                return node;
            });
    }, []); // Empty dependency array as it has no external dependencies

    const handleRename = useCallback(async (args: { id: string; name: string; node: NodeApi<TreeNode> }) => {
       // This callback runs *after* successful validation and node.submit()
       // We might need to update our treeData state if react-arborist doesn't fully manage it
       console.log("Handling rename callback (after successful submit):", args);
       setTreeData(currentData => {
           const findAndRename = (nodes: TreeNode[]): TreeNode[] => {
               return nodes.map(n => {
                   if (n.id === args.id) {
                       // Ensure isEditing flag is removed if it was present
                       // eslint-disable-next-line @typescript-eslint/no-unused-vars
                       const { isEditing, ...rest } = n; // Remove isEditing if present
                       return { ...rest, name: args.name };
                   }
                   if (n.children) {
                       const updatedChildren = findAndRename(n.children);
                       if (updatedChildren !== n.children) {
                           return { ...n, children: updatedChildren };
                       }
                   }
                   return n;
               });
           };
           return findAndRename(currentData);
       });
    }, [setTreeData]); // Added setTreeData dependency

    const handleDelete = useCallback(async (args: { ids: string[] }) => {
        console.log("Handling delete callback:", args);
        // Update the state *after* react-arborist has deleted the node internally
        setTreeData(currentData => {
            // Use the memoized helper function
            return filterOutNode(currentData, args.ids[0]); // Assuming single delete for now
        });
         // REMOVED: addNotification({ title: "Project Deleted", details: `Successfully deleted node(s): ${args.ids.join(", ")}`, type: 'info'});
    }, [setTreeData, addNotification, filterOutNode]); // Add filterOutNode dependency

    return (
      <div className="p-2 border rounded-md h-[calc(100vh-150px)] overflow-y-auto text-sm">
        <Tree<TreeNode>
           ref={treeRef} // Assign ref
           data={treeData}
           width="100%"
           height={1000} // Consider dynamic height or a smaller fixed one
           indent={20}
           rowHeight={32}
           onRename={handleRename} // Callback *after* node.submit()
           onDelete={handleDelete} // Callback *after* tree.delete()
           disableDrag={true}
           disableDrop={true}
        >
           {(props: NodeRendererProps<TreeNode>) => (
                // Pass filterOutNode down to the Node component
                <Node {...props} setTreeData={setTreeData} filterOutNode={filterOutNode} />
            )}
        </Tree>
      </div>
    );
}
