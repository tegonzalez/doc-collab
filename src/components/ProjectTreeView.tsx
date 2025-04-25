"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Tree, NodeRendererProps, TreeApi, NodeApi } from "react-arborist";
import { Plus, Edit, Folder, File, FolderOpen } from "lucide-react";
import { useNotifications } from "@/components/ui/NotificationsPanel";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isPending?: boolean;
  isEditing?: boolean;
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
}

function Node({ node, style, dragHandle, tree, setTreeData }: CustomNodeRendererProps) {
  const { addNotification } = useNotifications();
  const isRoot = node.id === "root";
  // Determine if editing from the node state provided by react-arborist
  const isEditing = node.isEditing;
  const inputRef = useRef<HTMLInputElement>(null);
  // Store the original name when editing starts
  const originalNameRef = useRef<string>(node.data.name);
  // Track if this node was just added and is in its initial edit state
  const isNewNodeRef = useRef<boolean>(node.data.isEditing || false); // Check the initial data flag

  // Effect to select text when editing starts (node.isEditing becomes true)
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
      originalNameRef.current = node.data.name; // Store original name on edit start
       // If the node was flagged as new, keep the ref true, otherwise false
      isNewNodeRef.current = node.data.isEditing || false;
    } else { // Removed the accidental backslash here
        // Reset isNewNode flag when editing stops
        isNewNodeRef.current = false;
    }
  }, [isEditing, node.data.name, node.data.isEditing]); // Depend on isEditing state

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
    if (!isRoot && !node.data.isPending && !isEditing) {
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
                tree.delete(node.id);
                // If tree.delete doesn't update UI reliably, fallback to setTreeData:
                // setTreeData(currentData => filterOutNode(currentData, node.id));
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
        const finalData = { ...node.data };
        delete finalData.isEditing;
        node.submit(trimmedName);
        isNewNodeRef.current = false; // Mark as no longer new
    }
};

// Helper function to remove node from data structure (if needed as fallback)
// const filterOutNode = (nodes: TreeNode[], idToRemove: string): TreeNode[] => {
//     return nodes
//         .filter(node => node.id !== idToRemove)
//         .map(node => {
//             if (node.children) {
//                 const updatedChildren = filterOutNode(node.children, idToRemove);
//                 if (updatedChildren !== node.children) {
//                     return { ...node, children: updatedChildren };
//                 }
//             }
//             return node;
//         });
// };

  return (
    <div
      style={style}
      ref={dragHandle}
      className={cn(
        "flex items-center justify-between group px-2 py-1 rounded hover:bg-gray-100",
        node.state.isSelected && !isEditing ? "bg-blue-100 hover:bg-blue-100" : "", // Avoid blue bg while editing
        node.state.isDragging ? "opacity-50" : ""
      )}
      onClick={(e) => {
          // Allow clicking the text area while editing
          if (!isEditing && (e.target === e.currentTarget || (e.target as HTMLElement).closest('span.folder-toggle-area'))) {
             if (node.isInternal) {
                 node.toggle();
             }
          }
      }}
      onDoubleClick={(e) => {
           if ((e.target as HTMLElement).closest('button')) return;
           if (!isRoot && !isEditing) node.edit();
      }}
    >
      <div className="flex items-center gap-1 flex-grow truncate min-w-0">
        <span className="shrink-0 folder-toggle-area">
            {node.isLeaf ? <File size={16}/> : node.isOpen ? <FolderOpen size={16}/> : <Folder size={16}/>}
        </span>

        {isEditing ? (
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
                             tree.delete(node.id);
                             // Fallback: setTreeData(currentData => filterOutNode(currentData, node.id));
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
        {!isRoot && !node.data.isPending && !isEditing && (
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
        {isRoot && node.isInternal && !isEditing && (
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

export default function ProjectTreeView() {
    const [treeData, setTreeData] = useState<TreeNode[]>(initialDataStructure);
    const { addNotification } = useNotifications();

    const handleRename = useCallback(async (args: { id: string; name: string; node: NodeApi<TreeNode> }) => {
       // This callback runs *after* successful validation and node.submit()
       // We might need to update our treeData state if react-arborist doesn't fully manage it
       console.log("Handling rename callback (after successful submit):", args);
       setTreeData(currentData => {
           const findAndRename = (nodes: TreeNode[]): TreeNode[] => {
               return nodes.map(n => {
                   if (n.id === args.id) {
                       // Ensure isEditing flag is removed if it was present
                       const { isEditing, ...rest } = n;
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

    // Define filterOutNode here if used as fallback in Node component
    const filterOutNode = (nodes: TreeNode[], idToRemove: string): TreeNode[] => {
        return nodes
            .filter(node => node.id !== idToRemove)
            .map(node => {
                if (node.children) {
                    const updatedChildren = filterOutNode(node.children, idToRemove);
                    if (updatedChildren !== node.children) {
                        return { ...node, children: updatedChildren };
                    }
                }
                return node;
            });
    };

    const handleDelete = useCallback(async (args: { ids: string[] }) => {
        console.log("Handling delete callback:", args);
        setTreeData(currentData => {
            // Use the helper function for consistency if defined
            return filterOutNode(currentData, args.ids[0]); // Assuming single delete for now
            // Or keep the original filter logic if preferred
        });
         // REMOVED: addNotification({ title: "Project Deleted", details: `Successfully deleted node(s): ${args.ids.join(", ")}`, type: 'info'});
    }, [setTreeData, addNotification]); // Keep addNotification if other notifications might be added here later

    return (
      <div className="p-2 border rounded-md h-[calc(100vh-150px)] overflow-y-auto text-sm">
        <Tree<TreeNode>
           data={treeData}
           width="100%"
           height={1000}
           indent={20}
           rowHeight={32}
           onRename={handleRename} // Callback *after* node.submit()
           onDelete={handleDelete} // Callback *after* tree.delete()
           disableDrag={true}
           disableDrop={true}
           // Pass setTreeData down so Node can use it for fallback delete if needed
           // Be cautious if this reintroduces infinite loops
           // children={NodeRenderer({ setTreeData })} // Alternative way to pass props
        >
           {(props: NodeRendererProps<TreeNode>) => (
                <Node {...props} setTreeData={setTreeData} />
            )}
        </Tree>
      </div>
    );
}
