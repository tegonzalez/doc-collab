"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Tree, NodeRendererProps, type TreeApi, type NodeApi } from "react-arborist"; 
import { Plus, Edit, Folder, File, FolderOpen } from "lucide-react";
import { useNotifications } from "@/components/ui/NotificationsPanel";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/queue/interface";

// Define the props interface for ProjectTreeView
interface ProjectTreeViewProps {
  projectId: string; // Expect a projectId prop
}

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
  if (Array.isArray(siblings) && siblings.some(sibling => sibling.data.name.toLowerCase() === trimmedName.toLowerCase())) {
    return "A project with this name already exists.";
  }
  return null;
};

interface CustomNodeRendererProps extends NodeRendererProps<TreeNode> {
    setTreeData: React.Dispatch<React.SetStateAction<TreeNode[]>>;
}

function Node({ node, style, dragHandle, tree, setTreeData }: CustomNodeRendererProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { addNotification } = useNotifications(); // Keep this if needed elsewhere, otherwise remove
  const isRoot = node.id === "root";
  const isNodeApiEditing = node.isEditing;
  const inputRef = useRef<HTMLInputElement>(null);
  const originalNameRef = useRef<string>(node.data.name);
  const isNewNodeRef = useRef<boolean>(node.data.isEditing || false);

  useEffect(() => {
    if (isNodeApiEditing && inputRef.current) {
      inputRef.current.select();
      originalNameRef.current = node.data.name;
      isNewNodeRef.current = node.data.isEditing || false;
    } else {
        isNewNodeRef.current = false;
    }
  }, [isNodeApiEditing, node.data.name, node.data.isEditing]);

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isRoot && node.isInternal) {
      const parentId = node.id;
      const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newNodeData: TreeNode = {
        id: newId,
        name: "Untitled",
        children: [],
        isEditing: true 
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

  const handleNameSubmit = (newName: string, isBlurEvent: boolean = false) => {
    const trimmedName = newName.trim();
    const siblings = node.parent?.children?.filter(n => n.id !== node.id);
    const validationError = validateName(trimmedName, siblings);

    if (validationError) {
        // Temporarily commenting out notification due to unused var warning
        // addNotification({ title: "Validation Error", details: validationError, type: 'error' });
        console.error("Validation Error:", validationError);

        if (isBlurEvent) {
            if (isNewNodeRef.current) {
                console.log("Deleting new node due to blur with invalid name:", node.id);
                tree.delete(node.id);
            } else {
                console.log("Resetting existing node due to blur with invalid name:", node.id);
                node.reset();
            }
        } else {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }
    } else {
        console.log("Submitting valid name:", trimmedName);
        node.submit(trimmedName);
        isNewNodeRef.current = false;
    }
};

  return (
    <div
      style={style}
      ref={dragHandle}
      className={cn(
        "flex items-center justify-between group px-2 py-1 rounded hover:bg-gray-100",
        node.state.isSelected && !isNodeApiEditing ? "bg-blue-100 hover:bg-blue-100" : "",
        node.state.isDragging ? "opacity-50" : ""
      )}
      onClick={(e) => {
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
                defaultValue={originalNameRef.current}
                onBlur={(e) => {
                    handleNameSubmit(e.currentTarget.value, true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                         e.preventDefault();
                         handleNameSubmit(e.currentTarget.value, false);
                    }
                    else if (e.key === 'Escape') {
                         e.preventDefault();
                         if (isNewNodeRef.current) {
                             console.log("Deleting new node on Escape:", node.id);
                             tree.delete(node.id);
                         } else {
                             console.log("Resetting existing node on Escape:", node.id);
                             node.reset();
                         }
                    }
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
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

  if (response.status !== 202) {
      console.warn(`Expected status 202 but got ${response.status}`);
  }
  return await response.json() as Task;
}

// Update component definition to accept ProjectTreeViewProps
export default function ProjectTreeView({ projectId }: ProjectTreeViewProps) {
    const [treeData, setTreeData] = useState<TreeNode[]>(initialDataStructure);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { addNotification } = useNotifications(); // Keep if needed, or remove
    const treeRef = useRef<TreeApi<TreeNode>>(null); 

    // TODO: Use projectId to fetch initial tree data or filter content
    useEffect(() => {
      console.log("ProjectTreeView mounted for projectId:", projectId);
      // Fetch initial data here based on projectId if needed
    }, [projectId]);

    const filterOutNode = useCallback((nodes: TreeNode[], idToRemove: string): TreeNode[] => {
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
    }, []);

    const handleRename = useCallback(async (args: { id: string; name: string; node: NodeApi<TreeNode> }) => {
       console.log("Handling rename callback (after successful submit):", args);
       setTreeData(currentData => {
           const findAndRename = (nodes: TreeNode[]): TreeNode[] => {
               return nodes.map(n => {
                   if (n.id === args.id) {
                       // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    }, [setTreeData]);

    const handleDelete = useCallback(async (args: { ids: string[] }) => {
        console.log("Handling delete callback:", args);
        setTreeData(currentData => {
            return filterOutNode(currentData, args.ids[0]);
        });
    }, [setTreeData, filterOutNode]);

    return (
      <div className="p-2 border rounded-md h-[calc(100vh-150px)] overflow-y-auto text-sm">
        <Tree<TreeNode>
           ref={treeRef}
           data={treeData}
           width="100%"
           height={1000} 
           indent={20}
           rowHeight={32}
           onRename={handleRename} 
           onDelete={handleDelete} 
           disableDrag={true}
           disableDrop={true}
        >
           {(props: NodeRendererProps<TreeNode>) => (
                <Node {...props} setTreeData={setTreeData} />
            )}
        </Tree>
      </div>
    );
}
