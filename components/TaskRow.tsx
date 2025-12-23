import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Edit, Trash2, AlertCircle, Minus, TrendingUp } from "lucide-react";
import { getLabelColors } from "@/lib/labels";
import { Task } from "@/types/models";

interface TaskRowProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

const TaskRow = ({ task, onDelete, onToggleComplete }: TaskRowProps) => {
  const formatDate = (dateString: string) => {
    return dateString.split("T")[0];
  };

  const getPriorityConfig = (priority: number | null) => {
    switch (priority) {
      case 3:
        return {
          label: "High",
          color: "bg-red-100 text-red-800 border-red-300",
          icon: AlertCircle,
        };
      case 1:
        return {
          label: "Low",
          color: "bg-gray-100 text-gray-800 border-gray-300",
          icon: Minus,
        };
      case 2:
      default:
        return {
          label: "Medium",
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: TrendingUp,
        };
    }
  };

  const priorityConfig = getPriorityConfig(task.priority ?? 2);
  const PriorityIcon = priorityConfig.icon;

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="py-2">
        <Checkbox
          checked={task.completed!}
          onCheckedChange={(checked) =>
            onToggleComplete(task.task_id, checked as boolean)
          }
        />
      </TableCell>
      <TableCell className="py-2">
        <Link
          href={`/task?id=${task.task_id}`}
          className="hover:underline font-medium"
        >
          {task.title}
        </Link>
      </TableCell>
      <TableCell className="py-2">
        {task.label && (
          <Badge
            variant="outline"
            className={[
              getLabelColors(task.label)["bg-color"],
              getLabelColors(task.label)["text-color"],
              getLabelColors(task.label)["border-color"],
            ].join(" ")}
          >
            {task.label}
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-2">
        <Badge
          variant="outline"
          className={`${priorityConfig.color} flex items-center gap-1 w-fit`}
        >
          <PriorityIcon className="h-3 w-3" />
          {priorityConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="py-2 whitespace-nowrap">
        {task.due_date ? formatDate(task.due_date) : ""}
      </TableCell>
      <TableCell className="text-right py-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/task?id=${task.task_id}`}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDelete(task.task_id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
