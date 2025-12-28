import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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

export const KanbanEmbed: React.FC<KanbanEmbedProps> = ({ dataString, onChange }) => {
  const [data, setData] = useState<KanbanData>(() => {
    if (dataString && dataString.trim() !== '') {
      try {
        return JSON.parse(dataString);
      } catch (e) {
        console.error("Failed to parse Kanban data", e);
        return initialData;
      }
    }
    return initialData;
  });

  const isMounted = React.useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      onChange(JSON.stringify(data));
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

  return (
    <div className="w-full h-full overflow-x-auto bg-gray-100 dark:bg-gray-900 p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full items-start">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

            return (
              <div key={column.id} className="w-72 bg-gray-200 dark:bg-gray-800 rounded-lg p-2 flex flex-col max-h-full shrink-0">
                <h3 className="font-bold p-2 text-gray-700 dark:text-gray-200">{column.title}</h3>
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
        </div>
      </DragDropContext>
    </div>
  );
};
