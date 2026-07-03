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
  getBezierPath,
  Position
} from '@xyflow/react';
import { TechNode } from './TechNode';
import { NodeEditorModal } from './NodeEditorModal';
import { TechNodeData } from '../types';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const nodeTypes = {
  techNode: TechNode,
};

const defaultEdgeOptions = {
  type: 'bezier',
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

  const [edgePath] = getBezierPath({
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

function HelperLinesRenderer({ horizontal, vertical }: { horizontal?: number, vertical?: number }) {
  const { zoom, x, y } = useViewport();
  
  return (
    <svg className="absolute inset-0 pointer-events-none z-40 w-full h-full overflow-visible">
      <g transform={`translate(${x},${y}) scale(${zoom})`}>
        {vertical !== undefined && (
          <line x1={vertical} y1={-100000} x2={vertical} y2={100000} stroke="#2a9d8f" strokeWidth={1} strokeDasharray="5,5" />
        )}
        {horizontal !== undefined && (
          <line x1={-100000} y1={horizontal} x2={100000} y2={horizontal} stroke="#2a9d8f" strokeWidth={1} strokeDasharray="5,5" />
        )}
      </g>
    </svg>
  );
}

function TechTreeContent({ isDevsMode }: { isDevsMode: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number} | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [helperLines, setHelperLines] = useState<{horizontal?: number, vertical?: number} | null>(null);

  const getUid = useCallback(() => {
    return isDevsMode ? 'devs_shared' : auth.currentUser?.uid;
  }, [isDevsMode]);

  // Load from Firebase
  useEffect(() => {
    const uid = getUid();
    if (!uid) return;
    
    const docRef = doc(db, 'trees', uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.nodes) setNodes(JSON.parse(data.nodes));
        if (data.edges) setEdges(JSON.parse(data.edges));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `trees/${uid}`);
    });

    return () => unsubscribe();
  }, [setNodes, setEdges, getUid]);

  // Save to Firebase
  const saveTree = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    const uid = getUid();
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
  }, [getUid]);

  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    let horizontal: number | undefined;
    let vertical: number | undefined;

    const nodeW = node.measured?.width ?? 192;
    const nodeH = node.measured?.height ?? 100;
    
    // Check snapping with a small distance tolerance, though snapToGrid is on, 
    // it helps to visualize when they align perfectly on grid.
    nodes.forEach((n) => {
      if (n.id === node.id) return;
      
      const nW = n.measured?.width ?? 192;
      const nH = n.measured?.height ?? 100;

      // Left to Left or Right to Right
      if (Math.abs(node.position.x - n.position.x) < 5) vertical = n.position.x;
      else if (Math.abs(node.position.x + nodeW - (n.position.x + nW)) < 5) vertical = n.position.x + nW;
      
      // Top to Top or Bottom to Bottom
      if (Math.abs(node.position.y - n.position.y) < 5) horizontal = n.position.y;
      else if (Math.abs(node.position.y + nodeH - (n.position.y + nH)) < 5) horizontal = n.position.y + nH;
    });

    setHelperLines({ horizontal, vertical });
  }, [nodes]);

  const onNodeDragStop = useCallback(() => {
    setHelperLines(null);
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
        style: { width: 192, height: 120 },
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
        onNodeDrag={onNodeDrag}
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
        {helperLines && <HelperLinesRenderer horizontal={helperLines.horizontal} vertical={helperLines.vertical} />}
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

export function TechTree({ isDevsMode }: { isDevsMode: boolean }) {
  return (
    <ReactFlowProvider>
      <TechTreeContent isDevsMode={isDevsMode} />
    </ReactFlowProvider>
  );
}

