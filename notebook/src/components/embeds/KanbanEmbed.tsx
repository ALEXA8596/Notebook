import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, X, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

interface KanbanData {
  tasks: { [key: string]: { id: string; content: string } };
  columns: { [key: string]: { id: string; title: string; taskIds: string[] } };
  columnOrder: string[];
}

interface KanbanEmbedProps {
  dataString: string;
  onChange: (newData: string) => void;
}

const initialData: KanbanData = {
  tasks: {},
  columns: {
    'column-1': {
      id: 'column-1',
      title: 'To Do',
      taskIds: [],
    },
    'column-2': {
      id: 'column-2',
      title: 'In Progress',
      taskIds: [],
    },
    'column-3': {
      id: 'column-3',
      title: 'Done',
      taskIds: [],
    },
  },
  columnOrder: ['column-1', 'column-2', 'column-3'],
};

// Validate and fix kanban data structure
const validateKanbanData = (data: any): KanbanData => {
  const result: KanbanData = {
    tasks: data?.tasks && typeof data.tasks === 'object' ? data.tasks : {},
    columns: data?.columns && typeof data.columns === 'object' ? data.columns : initialData.columns,
    columnOrder: Array.isArray(data?.columnOrder) ? data.columnOrder : initialData.columnOrder,
  };
  
  // Filter columnOrder to only include existing columns
  result.columnOrder = result.columnOrder.filter(id => result.columns[id]);
  
  // If no valid columns, use defaults
  if (result.columnOrder.length === 0) {
    result.columns = initialData.columns;
    result.columnOrder = initialData.columnOrder;
  }
  
  return result;
};

export const KanbanEmbed: React.FC<KanbanEmbedProps> = ({ dataString, onChange }) => {
  const [data, setData] = useState<KanbanData>(() => {
    if (dataString && dataString.trim() !== '') {
      try {
        const parsed = JSON.parse(dataString);
        return validateKanbanData(parsed);
      } catch (e) {
        console.error("Failed to parse Kanban data", e);
        return initialData;
      }
    }
    return initialData;
  });

  const isMounted = React.useRef(false);
  const onChangeRef = React.useRef(onChange);
  
  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isMounted.current) {
      onChangeRef.current(JSON.stringify(data));
    } else {
      isMounted.current = true;
    }
  }, [data]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...start,
        taskIds: newTaskIds,
      };

      setData((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [newColumn.id]: newColumn,
        },
      }));
      return;
    }

    // Moving from one list to another
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...start,
      taskIds: startTaskIds,
    };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finish,
      taskIds: finishTaskIds,
    };

    setData((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    }));
  };

  const addTask = (columnId: string) => {
    const newTaskId = uuidv4();
    const newTask = { id: newTaskId, content: 'New Task' };

    setData((prev) => {
      const newTasks = { ...prev.tasks, [newTaskId]: newTask };
      const newColumn = {
        ...prev.columns[columnId],
        taskIds: [...prev.columns[columnId].taskIds, newTaskId],
      };
      return {
        ...prev,
        tasks: newTasks,
        columns: { ...prev.columns, [columnId]: newColumn },
      };
    });
  };

  const updateTaskContent = (taskId: string, content: string) => {
    setData((prev) => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], content },
      },
    }));
  };

  const deleteTask = (columnId: string, taskId: string) => {
    setData((prev) => {
      const newColumnTaskIds = prev.columns[columnId].taskIds.filter(id => id !== taskId);
      const newTasks = { ...prev.tasks };
      delete newTasks[taskId];
      
      return {
        ...prev,
        tasks: newTasks,
        columns: {
          ...prev.columns,
          [columnId]: { ...prev.columns[columnId], taskIds: newColumnTaskIds }
        }
      };
    });
  };

  const addColumn = () => {
    const newColumnId = uuidv4();
    const newColumn = {
      id: newColumnId,
      title: 'New Column',
      taskIds: [],
    };
    setData((prev) => ({
      ...prev,
      columns: { ...prev.columns, [newColumnId]: newColumn },
      columnOrder: [...prev.columnOrder, newColumnId],
    }));
  };

  const updateColumnTitle = (columnId: string, title: string) => {
    setData((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [columnId]: { ...prev.columns[columnId], title },
      },
    }));
  };

  const deleteColumn = (columnId: string) => {
    setData((prev) => {
      const column = prev.columns[columnId];
      const newTasks = { ...prev.tasks };
      // Remove all tasks in this column
      column.taskIds.forEach(taskId => {
        delete newTasks[taskId];
      });
      
      const newColumns = { ...prev.columns };
      delete newColumns[columnId];
      
      return {
        ...prev,
        tasks: newTasks,
        columns: newColumns,
        columnOrder: prev.columnOrder.filter(id => id !== columnId),
      };
    });
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    setData((prev) => {
      const newOrder = Array.from(prev.columnOrder);
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      return { ...prev, columnOrder: newOrder };
    });
  };

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);

  return (
    <div className="w-full h-full overflow-x-auto bg-gray-100 dark:bg-gray-900 p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full items-start">
          {data.columnOrder.map((columnId, columnIndex) => {
            const column = data.columns[columnId];
            if (!column) return null; // Skip invalid columns
            const tasks = (column.taskIds || []).map((taskId) => data.tasks[taskId]).filter(Boolean);

            return (
              <div key={column.id} className="w-72 bg-gray-200 dark:bg-gray-800 rounded-lg p-2 flex flex-col max-h-full shrink-0">
                {/* Column Header */}
                <div className="flex items-center gap-1 p-2 group">
                  {/* Column Reorder Buttons */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {columnIndex > 0 && (
                      <button
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => moveColumn(columnIndex, columnIndex - 1)}
                        title="Move Left"
                      >
                        <GripVertical size={12} className="rotate-90" />
                      </button>
                    )}
                  </div>
                  
                  {editingColumnId === column.id ? (
                    <input
                      className="flex-1 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded outline-none text-gray-700 dark:text-gray-200"
                      value={column.title}
                      onChange={(e) => updateColumnTitle(column.id, e.target.value)}
                      onBlur={() => setEditingColumnId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingColumnId(null)}
                      autoFocus
                    />
                  ) : (
                    <h3 
                      className="flex-1 font-bold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 px-2 py-1 rounded"
                      onClick={() => setEditingColumnId(column.id)}
                    >
                      {column.title}
                    </h3>
                  )}
                  
                  {/* Column Menu */}
                  <div className="relative">
                    <button
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-opacity"
                      onClick={() => setColumnMenuOpen(columnMenuOpen === column.id ? null : column.id)}
                    >
                      <MoreVertical size={14} className="text-gray-500" />
                    </button>
                    {columnMenuOpen === column.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 rounded shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10 min-w-[120px]">
                        <button
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          onClick={() => { setEditingColumnId(column.id); setColumnMenuOpen(null); }}
                        >
                          <Edit2 size={12} /> Rename
                        </button>
                        <button
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 text-red-500"
                          onClick={() => { deleteColumn(column.id); setColumnMenuOpen(null); }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-grow overflow-y-auto min-h-[100px] space-y-2 p-1"
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white dark:bg-gray-700 p-3 rounded shadow group relative"
                            >
                              <input
                                className="w-full bg-transparent outline-none text-sm"
                                value={task.content}
                                onChange={(e) => updateTaskContent(task.id, e.target.value)}
                              />
                              <button 
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                                onClick={() => deleteTask(column.id, task.id)}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <button
                  className="mt-2 flex items-center justify-center w-full py-2 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 rounded"
                  onClick={() => addTask(column.id)}
                >
                  <Plus size={16} />
                </button>
              </div>
            );
          })}
          
          {/* Add Column Button */}
          <button
            className="w-72 h-12 shrink-0 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center gap-2 text-gray-500"
            onClick={addColumn}
          >
            <Plus size={16} /> Add Column
          </button>
        </div>
      </DragDropContext>
    </div>
  );
};
