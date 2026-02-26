<script lang="ts">
	import { onMount } from 'svelte';
	import { appPhase } from '$lib/stores/uiStore';
	import { completedSession } from '$lib/stores/sessionStore';
	import { historyStore } from '$lib/stores/historyStore';
	import { SCALES } from '$lib/music/scales';
	import type { CompletedSession } from '$lib/stores/sessionStore';

	let sessions: CompletedSession[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	onMount(async () => {
		try {
			sessions = await historyStore.getAll();
		} catch (e) {
			error = 'Could not load history.';
		} finally {
			loading = false;
		}
	});

	function formatDate(ts: number): string {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(ts));
	}

	function formatDuration(ms: number): string {
		const secs = Math.round(ms / 1000);
		if (secs < 60) return `${secs}s`;
		return `${Math.floor(secs / 60)}m ${secs % 60}s`;
	}

	function openSession(session: CompletedSession) {
		completedSession.set(session);
		appPhase.set('reviewing');
	}

	async function deleteSession(id: string, e: MouseEvent) {
		e.stopPropagation();
		await historyStore.delete(id);
		sessions = sessions.filter((s) => s.id !== id);
	}
</script>

<div class="history-view">
	<header class="history-header">
		<button class="back-btn" onclick={() => appPhase.set('idle')}>← Back</button>
		<h2 class="history-title">Session History</h2>
	</header>

	<div class="history-list">
		{#if loading}
			<p class="state-msg">Loading…</p>
		{:else if error}
			<p class="state-msg error">{error}</p>
		{:else if sessions.length === 0}
			<p class="state-msg">No sessions saved yet. Complete a run to see it here.</p>
		{:else}
			{#each sessions as session (session.id)}
				<div class="session-card" onclick={() => openSession(session)} role="button" tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && openSession(session)}>
					<div class="session-main">
						<div class="session-info">
							<span class="session-key">{session.key} {SCALES[session.scale]?.name ?? session.scale}</span>
							<span class="session-meta">{session.mode} · {formatDuration(session.durationMs)}</span>
							<span class="session-date">{formatDate(session.startedAt)}</span>
						</div>
						<div class="session-grade grade-{session.score.grade.toLowerCase()}">
							{session.score.grade}
						</div>
					</div>
					<div class="session-score-bar">
						<div
							class="session-score-fill"
							style="width: {session.score.percentOnScale}%"
						></div>
					</div>
					<button
						class="delete-btn"
						onclick={(e) => deleteSession(session.id, e)}
						aria-label="Delete session"
						title="Delete"
					>
						✕
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.history-view {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
	}

	.history-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.back-btn {
		font-size: 14px;
		padding: 0 10px;
	}

	.history-title {
		font-size: 16px;
		font-weight: 600;
	}

	.history-list {
		flex: 1;
		overflow-y: auto;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.state-msg {
		color: var(--color-muted);
		text-align: center;
		padding: 40px 0;
		font-size: 14px;
	}

	.state-msg.error {
		color: #fca5a5;
	}

	.session-card {
		position: relative;
		width: 100%;
		text-align: left;
		padding: 12px 44px 12px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: auto;
	}

	.session-card:hover {
		border-color: #475569;
	}

	.session-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.session-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.session-key {
		font-weight: 600;
		font-size: 14px;
	}

	.session-meta,
	.session-date {
		font-size: 12px;
		color: var(--color-muted);
	}

	.session-grade {
		font-size: 20px;
		font-weight: 900;
		width: 36px;
		height: 36px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.grade-s { background: #0d3b38; color: #2dd4bf; }
	.grade-a { background: #1a2744; color: #63b3ed; }
	.grade-b { background: #2a1e0a; color: #fbbf24; }
	.grade-c { background: #1e2030; color: #94a3b8; }
	.grade-d { background: #1e2030; color: #64748b; }

	.session-score-bar {
		height: 3px;
		background: #1e293b;
		border-radius: 2px;
		overflow: hidden;
	}

	.session-score-fill {
		height: 100%;
		background: var(--color-accent);
		border-radius: 2px;
		transition: width 0.3s;
	}

	.delete-btn {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		min-height: auto;
		min-width: auto;
		width: 28px;
		height: 28px;
		padding: 0;
		font-size: 12px;
		border-radius: 50%;
		background: transparent;
		border-color: transparent;
		color: var(--color-muted);
	}

	.delete-btn:hover {
		background: #2d1b1b;
		color: #fca5a5;
		border-color: #7f4040;
	}
</style>
