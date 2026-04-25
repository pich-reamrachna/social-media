<div class="sk-shell">
	<!-- Left nav (same as HomeSkeleton) -->
	<nav class="sk-nav">
		<div class="sk-nav-top">
			<div class="sk-logo skeleton"></div>
			<div class="sk-nav-links">
				{#each [0, 1] as i (i)}
					<div class="sk-nav-item">
						<div class="sk-nav-icon skeleton"></div>
						<div class="sk-nav-text skeleton"></div>
					</div>
				{/each}
			</div>
		</div>
		<div class="sk-nav-bottom">
			<div class="sk-settings skeleton"></div>
			<div class="sk-user-row">
				<div class="sk-user-avatar skeleton"></div>
				<div class="sk-user-meta">
					<div class="sk-user-name skeleton"></div>
					<div class="sk-user-handle skeleton"></div>
				</div>
			</div>
		</div>
	</nav>

	<!-- Profile feed column -->
	<main class="sk-feed">
		<!-- Sticky header bar -->
		<div class="sk-header-bar">
			<div class="sk-header-label skeleton"></div>
		</div>

		<!-- Banner -->
		<div class="sk-banner skeleton"></div>

		<!-- Avatar + action button row -->
		<div class="sk-profile-top">
			<div class="sk-profile-avatar skeleton"></div>
			<div class="sk-action-btn skeleton"></div>
		</div>

		<!-- Name / handle / bio / stats -->
		<div class="sk-profile-info">
			<div class="sk-profile-name skeleton"></div>
			<div class="sk-profile-handle skeleton"></div>
			<div class="sk-bio">
				<div class="sk-line skeleton"></div>
				<div class="sk-line sk-line-70 skeleton"></div>
			</div>
			<div class="sk-meta-row">
				<div class="sk-meta-item skeleton"></div>
				<div class="sk-meta-item skeleton"></div>
			</div>
			<div class="sk-stats-row">
				<div class="sk-stat skeleton"></div>
				<div class="sk-stat skeleton"></div>
			</div>
		</div>

		<!-- Tabs -->
		<div class="sk-tabs">
			{#each [0, 1, 2] as i (i)}
				<div class="sk-tab-item skeleton"></div>
			{/each}
		</div>

		<!-- Post skeletons -->
		{#each [0, 1, 2, 3] as i (i)}
			<div class="sk-post">
				<div class="sk-post-header">
					<div class="sk-post-avatar skeleton"></div>
					<div class="sk-post-meta">
						<div class="sk-post-name skeleton"></div>
						<div class="sk-post-handle skeleton"></div>
					</div>
				</div>
				<div class="sk-post-body">
					<div class="sk-line skeleton"></div>
					<div class="sk-line sk-line-78 skeleton"></div>
					<div class="sk-line sk-line-52 skeleton"></div>
				</div>
				<div class="sk-post-actions">
					<div class="sk-action skeleton"></div>
					<div class="sk-action skeleton"></div>
				</div>
			</div>
		{/each}
	</main>

	<!-- Right sidebar (no search, matches profile page) -->
	<aside class="sk-sidebar">
		<div class="sk-sidebar-card">
			<div class="sk-card-title skeleton"></div>
			{#each [0, 1, 2] as i (i)}
				<div class="sk-follow-item">
					<div class="sk-follow-avatar skeleton"></div>
					<div class="sk-follow-info">
						<div class="sk-follow-name skeleton"></div>
						<div class="sk-follow-handle skeleton"></div>
					</div>
					<div class="sk-follow-btn skeleton"></div>
				</div>
			{/each}
		</div>
	</aside>
</div>

<style>
	@keyframes sk-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.skeleton {
		background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
		background-size: 200% 100%;
		animation: sk-shimmer 1.6s ease-in-out infinite;
		border-radius: 0.375rem;
	}

	/* Shell grid */
	.sk-shell {
		display: grid;
		grid-template-columns: 260px 1fr 300px;
		min-height: 100vh;
		width: 100%;
		background-color: #0d0d0d;
		color: #f3f4f6;
		align-items: start;
	}

	/* Left nav */
	.sk-nav {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 1.5rem 1.25rem;
		border-right: 1px solid #1f1f1f;
		position: sticky;
		top: 0;
		height: 100vh;
		background-color: #0d0d0d;
	}

	.sk-nav-top,
	.sk-nav-bottom {
		display: flex;
		flex-direction: column;
	}

	.sk-logo {
		width: 2rem;
		height: 3rem;
		margin-bottom: 2rem;
	}

	.sk-nav-links {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.sk-nav-item {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.75rem 0.875rem;
	}

	.sk-nav-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		border-radius: 0.25rem;
	}

	.sk-nav-text {
		height: 0.75rem;
		width: 3.5rem;
	}

	.sk-settings {
		height: 2.75rem;
		border-radius: 9999px;
		margin-bottom: 0.5rem;
	}

	.sk-user-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.sk-user-avatar {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.sk-user-meta {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex: 1;
	}

	.sk-user-name {
		height: 0.7rem;
		width: 5rem;
	}

	.sk-user-handle {
		height: 0.6rem;
		width: 3.5rem;
	}

	/* Profile feed column */
	.sk-feed {
		border-right: 1px solid #1f1f1f;
		min-height: 100vh;
		background-color: #0d0d0d;
	}

	.sk-header-bar {
		display: flex;
		align-items: center;
		padding: 0 1rem;
		height: 3.25rem;
		border-bottom: 1px solid #1f1f1f;
		position: sticky;
		top: 0;
		background-color: rgba(13, 13, 13, 0.98);
		backdrop-filter: blur(14px);
		z-index: 20;
	}

	.sk-header-label {
		height: 0.65rem;
		width: 3.5rem;
	}

	.sk-banner {
		height: 12rem;
		width: 100%;
		border-radius: 0;
	}

	.sk-profile-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 0 1rem;
		margin-top: -3.5rem;
	}

	.sk-profile-avatar {
		width: 7.5rem;
		height: 7.5rem;
		border-radius: 9999px;
		border: 4px solid #0d0d0d;
		flex-shrink: 0;
	}

	.sk-action-btn {
		height: 2rem;
		width: 7rem;
		border-radius: 9999px;
		margin-top: 4rem;
	}

	.sk-profile-info {
		padding: 0.75rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sk-profile-name {
		height: 1.25rem;
		width: 9rem;
	}

	.sk-profile-handle {
		height: 0.75rem;
		width: 6rem;
	}

	.sk-bio {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}

	.sk-meta-row {
		display: flex;
		gap: 1rem;
		margin-top: 0.25rem;
	}

	.sk-meta-item {
		height: 0.65rem;
		width: 7rem;
	}

	.sk-stats-row {
		display: flex;
		gap: 1rem;
	}

	.sk-stat {
		height: 0.75rem;
		width: 5rem;
	}

	/* Tabs */
	.sk-tabs {
		display: flex;
		border-bottom: 1px solid #1f1f1f;
		margin-top: 0.5rem;
	}

	.sk-tab-item {
		flex: 1;
		height: 0.65rem;
		margin: 1rem 1.5rem;
	}

	/* Post skeletons */
	.sk-post {
		padding: 1.25rem;
		border-bottom: 1px solid #1f1f1f;
	}

	.sk-post-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.875rem;
	}

	.sk-post-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.sk-post-meta {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex: 1;
		padding-top: 0.25rem;
	}

	.sk-post-name {
		height: 0.75rem;
		width: 7rem;
	}

	.sk-post-handle {
		height: 0.65rem;
		width: 5rem;
	}

	.sk-post-body {
		margin-left: 3.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sk-line {
		height: 0.8rem;
		width: 100%;
	}

	.sk-line-78 {
		width: 78%;
	}
	.sk-line-70 {
		width: 70%;
	}
	.sk-line-52 {
		width: 52%;
	}

	.sk-post-actions {
		display: flex;
		gap: 1.5rem;
		margin-left: 3.25rem;
		margin-top: 0.875rem;
	}

	.sk-action {
		height: 0.65rem;
		width: 2.5rem;
	}

	/* Right sidebar */
	.sk-sidebar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 1.25rem;
		position: sticky;
		top: 0;
		height: 100vh;
		background-color: #0d0d0d;
	}

	.sk-sidebar-card {
		background-color: #111111;
		border: 1px solid #1f1f1f;
		border-radius: 1rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.sk-card-title {
		height: 0.875rem;
		width: 6rem;
	}

	.sk-follow-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.sk-follow-avatar {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.sk-follow-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.sk-follow-name {
		height: 0.7rem;
		width: 5rem;
	}

	.sk-follow-handle {
		height: 0.6rem;
		width: 3.5rem;
	}

	.sk-follow-btn {
		height: 1.75rem;
		width: 5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	/* Responsive */
	@media (max-width: 1280px) {
		.sk-shell {
			grid-template-columns: 80px 1fr 280px;
		}
		.sk-nav {
			align-items: center;
			padding: 1.5rem 0.5rem;
		}
		.sk-nav-top,
		.sk-nav-bottom {
			align-items: center;
		}
		.sk-nav-text,
		.sk-user-meta,
		.sk-logo {
			display: none;
		}
		.sk-nav-item {
			justify-content: center;
		}
		.sk-settings {
			width: 2.75rem;
		}
		.sk-user-row {
			justify-content: center;
		}
	}

	@media (max-width: 1024px) {
		.sk-shell {
			grid-template-columns: 80px 1fr;
		}
		.sk-sidebar {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.sk-shell {
			grid-template-columns: 1fr;
		}
		.sk-nav {
			display: none;
		}
		.sk-feed {
			border-right: none;
		}
	}
</style>
