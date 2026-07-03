import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  useNodes,
  useViewport,
  getSmoothStepPath,
  Position
} from '@xyflow/react';
import { TechNode } from './TechNode';
import { NodeEditorModal } from './NodeEditorModal';
import { TechNodeData } from '../types';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const nodeTypes = {
  techNode: TechNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: { stroke: '#b58e3d', strokeWidth: 3 },
};

function TempConnectionLine({ sourceId }: { sourceId: string }) {
  const nodes = useNodes();
  const { x, y, zoom } = useViewport();
  const { screenToFlowPosition } = useReactFlow();
  const sourceNode = nodes.find((n) => n.id === sourceId);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [screenToFlowPosition]);

  if (!sourceNode) return null;

  const sourceWidth = sourceNode.measured?.width || 192;
  const sourceHeight = sourceNode.measured?.height || 100;
  
  const sourceFlowX = sourceNode.position.x + sourceWidth;
  const sourceFlowY = sourceNode.position.y + sourceHeight / 2;

  const [edgePath] = getSmoothStepPath({
    sourceX: sourceFlowX,
    sourceY: sourceFlowY,
    sourcePosition: Position.Right,
    targetX: mousePos.x,
    targetY: mousePos.y,
    targetPosition: Position.Left,
  });

  return (
    <svg className="absolute inset-0 pointer-events-none z-50 w-full h-full overflow-visible">
      <g transform={`translate(${x},${y}) scale(${zoom})`}>
        <path
          d={edgePath}
          stroke="#b58e3d"
          strokeWidth={3}
          fill="none"
        />
      </g>
    </svg>
  );
}

function TechTreeContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number} | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Load from Firebase
  useEffect(() => {
    const loadTree = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const docRef = doc(db, 'trees', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.nodes) setNodes(JSON.parse(data.nodes));
          if (data.edges) setEdges(JSON.parse(data.edges));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `trees/${uid}`);
      }
    };
    loadTree();
  }, [setNodes, setEdges]);

  // Save to Firebase
  const saveTree = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'trees', uid), {
        nodes: JSON.stringify(currentNodes),
        edges: JSON.stringify(currentEdges),
        ownerId: uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trees/${uid}`);
    }
  }, []);

  const onNodeDragStop = useCallback(() => {
    saveTree(nodes, edges);
  }, [nodes, edges, saveTree]);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenuPos(position);
      setEditingNode(null);
      setModalOpen(true);
    },
    [screenToFlowPosition]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setEditingNode(node);
      setModalOpen(true);
    },
    []
  );

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setConnectingId(node.id);
    },
    []
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (connectingId) {
        if (connectingId !== node.id) {
          const newEdge: Edge = {
            id: `e-${connectingId}-${node.id}`,
            source: connectingId,
            target: node.id,
            sourceHandle: 'r',
            targetHandle: 'l',
          };
          setEdges((eds) => {
            const next = addEdge(newEdge, eds);
            saveTree(nodes, next);
            return next;
          });
        }
        setConnectingId(null);
      }
    },
    [connectingId, nodes, saveTree, setEdges]
  );

  const onPaneClick = useCallback(() => {
    if (connectingId) {
      setConnectingId(null);
    }
  }, [connectingId]);

  const handleSaveNode = (data: TechNodeData) => {
    let updatedNodes = [...nodes];
    if (editingNode) {
      updatedNodes = nodes.map(n => 
        n.id === editingNode.id ? { ...n, data } : n
      );
    } else if (contextMenuPos) {
      const newNode: Node = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'techNode',
        position: contextMenuPos,
        data,
      };
      updatedNodes = nodes.concat(newNode);
    }
    setNodes(updatedNodes);
    saveTree(updatedNodes, edges);
    setModalOpen(false);
  };

  const handleDeleteNode = () => {
    if (editingNode) {
      const updatedNodes = nodes.filter(n => n.id !== editingNode.id);
      const updatedEdges = edges.filter(e => e.source !== editingNode.id && e.target !== editingNode.id);
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      saveTree(updatedNodes, updatedEdges);
    }
    setModalOpen(false);
  };

  return (
    <div className="w-full h-full bg-[#0c141d] bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={true}
        snapGrid={[20, 20]}
        panOnScroll={true}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        panOnDrag={[1, 2]}
        fitView
      >
        {connectingId && <TempConnectionLine sourceId={connectingId} />}
      </ReactFlow>

      <NodeEditorModal 
        isOpen={modalOpen} 
        initialData={editingNode ? (editingNode.data as TechNodeData) : null}
        onSave={handleSaveNode}
        onClose={() => setModalOpen(false)}
        onDelete={editingNode ? handleDeleteNode : undefined}
      />
    </div>
  );
}

export function TechTree() {
  return (
    <ReactFlowProvider>
      <TechTreeContent />
    </ReactFlowProvider>
  );
}

