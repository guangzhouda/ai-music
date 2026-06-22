import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Tag } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { Metric } from "../components/Metric";
import { EmptyState } from "../components/EmptyState";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";
import { taskStatusLabel } from "../data/options";
const statusToneMap = {
    queued: "default",
    running: "accent",
    succeeded: "success",
    failed: "default"
};
export function TasksPage(props) {
    const sortedTasks = [...props.tasks].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    const [taskMessage, setTaskMessage] = useState("");
    const [busyTaskIds, setBusyTaskIds] = useState([]);
    async function refreshTask(taskId) {
        setBusyTaskIds((current) => [...current, taskId]);
        setTaskMessage("");
        try {
            await fetchJson(`/api/tasks/${taskId}/refresh`, {
                method: "POST"
            });
            await props.onSuccess();
        }
        catch (error) {
            setTaskMessage(toReadableErrorMessage(error));
        }
        finally {
            setBusyTaskIds((current) => current.filter((id) => id !== taskId));
        }
    }
    async function retryTask(taskId) {
        setBusyTaskIds((current) => [...current, taskId]);
        setTaskMessage("");
        try {
            await fetchJson(`/api/tasks/${taskId}/retry`, {
                method: "POST"
            });
            await props.onSuccess();
            setTaskMessage("已基于失败任务重新创建新的歌曲任务。");
        }
        catch (error) {
            setTaskMessage(toReadableErrorMessage(error));
        }
        finally {
            setBusyTaskIds((current) => current.filter((id) => id !== taskId));
        }
    }
    async function deleteFailedTask(taskId) {
        setBusyTaskIds((current) => [...current, taskId]);
        setTaskMessage("");
        try {
            await fetchJson(`/api/tasks/${taskId}`, {
                method: "DELETE"
            });
            await props.onSuccess();
            setTaskMessage("失败任务已删除。");
        }
        catch (error) {
            setTaskMessage(toReadableErrorMessage(error));
        }
        finally {
            setBusyTaskIds((current) => current.filter((id) => id !== taskId));
        }
    }
    return (_jsx("div", { className: "single-column tasks-page", children: _jsxs("section", { className: "task-stage", children: [_jsx("div", { className: "task-stage-header", children: _jsx(SectionTitle, { eyebrow: "Tasks", title: "\u4EFB\u52A1\u4E2D\u5FC3", description: "\u6240\u6709\u6B4C\u66F2\u751F\u6210\u90FD\u4F1A\u8FDB\u5165\u7EDF\u4E00\u72B6\u6001\u673A\u3002\u6392\u961F\u4E2D\u8868\u793A\u4EFB\u52A1\u5DF2\u63D0\u4EA4\u7ED9 provider\uFF0C\u4F46\u8FD8\u5728\u7B49\u5F85\u5F00\u59CB\u751F\u6210\u3002" }) }), _jsxs("div", { className: "task-summary", children: [_jsx(Metric, { title: "\u603B\u4EFB\u52A1", value: String(props.tasks.length) }), _jsx(Metric, { title: "\u6210\u529F", value: String(props.tasks.filter((task) => task.status === "succeeded").length) }), _jsx(Metric, { title: "\u5904\u7406\u4E2D", value: String(sortedTasks.filter((task) => task.status === "queued" || task.status === "running").length) })] }), taskMessage ? _jsx("div", { className: "inline-message", children: taskMessage }) : null, _jsx("div", { className: "task-list-page", children: sortedTasks.length === 0 ? (_jsx(EmptyState, { text: "\u5F53\u524D\u6CA1\u6709\u4EFB\u52A1\u3002" })) : (sortedTasks.map((task) => (_jsxs("article", { className: "task-card", children: [_jsxs("div", { children: [_jsx("strong", { children: task.title }), _jsx("p", { children: task.progressLabel }), _jsx("small", { children: task.providerTaskId ?? "等待 provider task id" }), task.errorMessage ? _jsx("small", { className: "task-error", children: task.errorMessage }) : null] }), _jsxs("div", { className: "task-actions", children: [_jsx(Tag, { tone: statusToneMap[task.status], children: taskStatusLabel(task.status) }), _jsx("button", { className: "ghost-button", disabled: busyTaskIds.includes(task.id), onClick: () => void refreshTask(task.id), type: "button", children: "\u67E5\u8BE2\u72B6\u6001" }), task.status === "failed" ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "ghost-button", disabled: busyTaskIds.includes(task.id), onClick: () => void retryTask(task.id), type: "button", children: "\u91CD\u8BD5\u4EFB\u52A1" }), _jsx("button", { className: "ghost-button", disabled: busyTaskIds.includes(task.id), onClick: () => void deleteFailedTask(task.id), type: "button", children: "\u5220\u9664\u5931\u8D25\u4EFB\u52A1" })] })) : null] })] }, task.id)))) })] }) }));
}
