import { useState } from "react";
import { Panel, Tag } from "@ai-music/ui";
import type { SongTask } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { Metric } from "../components/Metric";
import { EmptyState } from "../components/EmptyState";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";
import { taskStatusLabel } from "../data/options";

const statusToneMap: Record<SongTask["status"], "default" | "accent" | "success"> = {
  queued: "default",
  running: "accent",
  succeeded: "success",
  failed: "default"
};

export function TasksPage(props: { tasks: SongTask[]; onSuccess: () => Promise<void> }) {
  const sortedTasks = [...props.tasks].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const [taskMessage, setTaskMessage] = useState("");
  const [busyTaskIds, setBusyTaskIds] = useState<string[]>([]);

  async function refreshTask(taskId: string) {
    setBusyTaskIds((current) => [...current, taskId]);
    setTaskMessage("");
    try {
      await fetchJson(`/api/tasks/${taskId}/refresh`, {
        method: "POST"
      });
      await props.onSuccess();
    } catch (error) {
      setTaskMessage(toReadableErrorMessage(error));
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  async function retryTask(taskId: string) {
    setBusyTaskIds((current) => [...current, taskId]);
    setTaskMessage("");
    try {
      await fetchJson(`/api/tasks/${taskId}/retry`, {
        method: "POST"
      });
      await props.onSuccess();
      setTaskMessage("已基于失败任务重新创建新的歌曲任务。");
    } catch (error) {
      setTaskMessage(toReadableErrorMessage(error));
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  async function deleteFailedTask(taskId: string) {
    setBusyTaskIds((current) => [...current, taskId]);
    setTaskMessage("");
    try {
      await fetchJson(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });
      await props.onSuccess();
      setTaskMessage("失败任务已删除。");
    } catch (error) {
      setTaskMessage(toReadableErrorMessage(error));
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  return (
    <div className="single-column tasks-page">
      <section className="task-stage">
        <div className="task-stage-header">
          <SectionTitle
            eyebrow="Tasks"
            title="任务中心"
            description="所有歌曲生成都会进入统一状态机。排队中表示任务已提交给 provider，但还在等待开始生成。"
          />
        </div>
        <div className="task-summary">
          <Metric title="总任务" value={String(props.tasks.length)} />
          <Metric
            title="成功"
            value={String(props.tasks.filter((task) => task.status === "succeeded").length)}
          />
          <Metric
            title="处理中"
            value={String(sortedTasks.filter((task) => task.status === "queued" || task.status === "running").length)}
          />
        </div>
        {taskMessage ? <div className="inline-message">{taskMessage}</div> : null}
        <div className="task-list-page">
          {sortedTasks.length === 0 ? (
            <EmptyState text="当前没有任务。" />
          ) : (
            sortedTasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.progressLabel}</p>
                  <small>{task.providerTaskId ?? "等待 provider task id"}</small>
                  {task.errorMessage ? <small className="task-error">{task.errorMessage}</small> : null}
                </div>
                <div className="task-actions">
                  <Tag tone={statusToneMap[task.status]}>
                    {taskStatusLabel(task.status)}
                  </Tag>
                  <button
                    className="ghost-button"
                    disabled={busyTaskIds.includes(task.id)}
                    onClick={() => void refreshTask(task.id)}
                    type="button"
                  >
                    查询状态
                  </button>
                  {task.status === "failed" ? (
                    <>
                      <button
                        className="ghost-button"
                        disabled={busyTaskIds.includes(task.id)}
                        onClick={() => void retryTask(task.id)}
                        type="button"
                      >
                        重试任务
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyTaskIds.includes(task.id)}
                        onClick={() => void deleteFailedTask(task.id)}
                        type="button"
                      >
                        删除失败任务
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
