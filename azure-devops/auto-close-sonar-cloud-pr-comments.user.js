// ==UserScript==
// @name         Auto Close SonarCloud PR Comments
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Automatically closes SonarQube comments on Azure DevOps Pull Requests using REST API
// @author       VictorRos
// @match        https://dev.azure.com/*/*/_git/*/pullrequest/*
// @icon         https://www.google.com/s2/favicons?domain=azure.com
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

/* jshint esversion:11 */

(function() {
	"use strict";

	const LOG_PREFIX = "[Close-SonarCloud-Comments]";

	/**
	 * Extracts PR information from URL
	 */
	function extractPRInfo() {
		const url = window.location.href;
		const match = url.match(/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/([^\/]+)\/pullrequest\/(\d+)/);

		if (!match) {
			console.error(`${LOG_PREFIX} Could not extract PR info from URL: ${url}`);
			return null;
		}

		return {
			organization: match[1],
			project: match[2],
			repository: match[3],
			pullRequestId: match[4]
		};
	}

	/**
	 * Gets repository ID from repository name
	 */
	async function getRepositoryId(organization, project, repositoryName) {
		try {
			const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryName}?api-version=7.1`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return data.id;
		} catch (error) {
			console.error(`${LOG_PREFIX} Error getting repository ID:`, error);
			// Try to extract from DOM as fallback
			const repoElement = document.querySelector("[data-repository-id]");
			if (repoElement) {
				return repoElement.getAttribute("data-repository-id");
			}
			return repositoryName; // Fallback to name
		}
	}

	/**
	 * Fetches all comment threads from PR using REST API
	 */
	async function fetchCommentThreads(organization, project, repositoryId, pullRequestId) {
		try {
			const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}/threads?api-version=7.1`;
			console.log(`${LOG_PREFIX} Fetching comments from API for PR #${pullRequestId}: ${url}`);

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			console.log(`${LOG_PREFIX} API returned ${data.value?.length || 0} thread(s)`);

			return data.value || [];
		} catch (error) {
			console.error(`${LOG_PREFIX} Error fetching comments:`, error);
			throw error;
		}
	}

	/**
	 * Shows a modern notification
	 */
	function showNotification(message, type = "info") {
		const notification = document.createElement("div");
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 20px;
			background-color: ${type === "error" ? "#d13438" : type === "success" ? "#107c10" : "#0078d4"};
			color: white;
			border-radius: 4px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			z-index: 10000;
			font-family: "Segoe UI", sans-serif;
			font-size: 14px;
			max-width: 400px;
			animation: slideIn 0.3s ease-out;
		`;

		// Add animation
		const style = document.createElement("style");
		style.textContent = `
			@keyframes slideIn {
				from { transform: translateX(100%); opacity: 0; }
				to { transform: translateX(0); opacity: 1; }
			}
		`;
		document.head.appendChild(style);

		notification.textContent = message;
		document.body.appendChild(notification);

		// Auto remove after 5 seconds
		setTimeout(() => {
			notification.style.animation = "slideIn 0.3s ease-out reverse";
			setTimeout(() => notification.remove(), 300);
		}, 5000);
	}

	/**
	 * Checks if a comment is from SonarQube by analyzing its content
	 * @param {Object} comment - The comment object from Azure DevOps API
	 * @returns {boolean} - True if the comment contains SonarQube link
	 */
	function isSonarQubeComment(comment) {
		const content = comment.content || "";
		return content.toLowerCase().includes("sonarqube cloud");
	}

	/**
	 * Gets the name of the status from the status code
	 * @param {string} status - The status code
	 * @returns {string} - The name of the status
	 */
	function getStatusNameFromStatus(status) {
		switch (status) {
			case "active":
				return "Active";
			case "fixed":
				return "Fixed";
			case "wontfix":
				return "WontFix";
			case "closed":
				return "Closed";
			case "resolved":
				return "Resolved";
			case "pending":
				return "Pending";
			default:
				return `Status-${status}`;
		}
	}

	/**
	 * Filters threads to find SonarQube comments that need to be closed (not already Closed)
	 */
	function filterActiveSonarQubeComments(threads) {
		const commentsToClose = [];
		const allSonarQubeComments = [];
		const statusCounts = {};

		console.log(`${LOG_PREFIX} Analyzing ${threads.length} thread(s) from API...`);

		// Log first few SonarQube threads to see exact API response
		const sonarQubeThreads = threads.filter((thread) => {
			if (!thread.comments || thread.comments.length === 0) return false;
			const firstComment = thread.comments[0];
			return isSonarQubeComment(firstComment);
		}).slice(0, 5);

		if (sonarQubeThreads.length > 0) {
			console.log(`${LOG_PREFIX} Sample SonarQube threads from API (first ${sonarQubeThreads.length}):`, sonarQubeThreads.map((thread) => ({
				id: thread.id,
				status: thread.status,
				value: JSON.stringify(thread.status),
				rawThread: thread
			})));
		}

		threads.forEach((thread) => {
			// Check if thread has comments
			if (!thread.comments || thread.comments.length === 0) {
				return;
			}

			// Skip deleted threads
			if (thread.isDeleted) {
				return;
			}

			// Get the first comment (usually the main comment)
			const firstComment = thread.comments[0];

			// Skip deleted comments
			if (firstComment.isDeleted) {
				return;
			}

			const threadStatus = thread.status;

			// Normalize status to lowercase string for comparison
			const statusStr = String(threadStatus).toLowerCase();
			const statusName = getStatusNameFromStatus(statusStr);

			statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;

			// Check if comment is from SonarQube by analyzing content
			if (isSonarQubeComment(firstComment)) {
				allSonarQubeComments.push({
					threadId: thread.id,
					status: threadStatus,
					statusName
				});

				console.log(`${LOG_PREFIX} Found SonarQube comment: Thread ${thread.id}, Status: ${threadStatus} (${statusName})`);

				// Close SonarQube comments that are NOT already logically closed
				// Logically closed statuses: Closed, Won't Fix (not treated), Resolved (treated)
				// Statuses to close: Active, Pending, Fixed, and any other status
				const isLogicallyClosed = ["closed", "wontfix", "resolved"].includes(statusStr);
				if (!isLogicallyClosed) {
					commentsToClose.push({
						threadId: thread.id,
						commentId: firstComment.id,
						thread,
						currentStatus: statusStr,
						statusName
					});
					console.log(`${LOG_PREFIX} → Will close thread ${thread.id} (current status: ${statusName})`);
				} else {
					console.log(`${LOG_PREFIX} → Skipping thread ${thread.id} (already logically closed: ${statusName})`);
				}
			}
		});

		console.log(`${LOG_PREFIX} Summary:`);
		console.log(`  - Total threads: ${threads.length}`);
		console.log(`  - SonarQube comments found: ${allSonarQubeComments.length}`);
		console.log(`  - SonarQube comments to close: ${commentsToClose.length}`);
		console.log(`  - Status breakdown:`, statusCounts);

		if (allSonarQubeComments.length > 0) {
			console.log(`${LOG_PREFIX} All SonarQube comments:`, allSonarQubeComments);
		}

		// Log comments that will NOT be closed (for debugging)
		// These are comments that are logically closed: Closed, Won't Fix, Resolved
		const alreadyClosed = allSonarQubeComments.filter(c => {
			const statusStr = String(c.status).toLowerCase();
			return statusStr === "closed" || statusStr === "wontfix" || statusStr === "resolved";
		});
		if (alreadyClosed.length > 0) {
			console.log(`${LOG_PREFIX} Already logically closed SonarQube comments (${alreadyClosed.length}):`, alreadyClosed);
		}

		return commentsToClose;
	}

	/**
	 * Updates thread status to "closed" using REST API
	 */
	async function updateThreadStatus(organization, project, repositoryId, pullRequestId, threadId) {
		try {
			const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}/threads/${threadId}?api-version=7.1`;

			console.log(`${LOG_PREFIX} Updating thread ${threadId} status to closed via API: ${url}`);

			const response = await fetch(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					status: "closed"
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
			}

			const data = await response.json();
			console.log(`${LOG_PREFIX} ✓ Thread ${threadId} status updated successfully`);
			return true;
		} catch (error) {
			console.error(`${LOG_PREFIX} Error updating thread ${threadId} status:`, error);
			return false;
		}
	}

	/**
	 * Creates the trigger button
	 */
	function createButton() {

		if (document.getElementById("close-sonar-cloud-btn")) {
			return; // Button already exists
		}

		// Find toolbar using the specific selector
		const toolbar = document.querySelector(".bolt-header-commandbar");

		if (!toolbar) {
			console.warn(`${LOG_PREFIX} Toolbar not found, will retry...`);
			return;
		}

		const button = document.createElement("button");
		button.id = "close-sonar-cloud-btn";
		button.textContent = "Close SonarCloud Comments";
		button.style.cssText = `
			margin-left: 8px;
			padding: 4px 12px;
			background-color: #0078d4;
			color: white;
			border: none;
			border-radius: 2px;
			cursor: pointer;
			font-size: 14px;
			font-family: "Segoe UI", sans-serif;
		`;

		button.addEventListener("click", async () => {
			if (button.disabled) {
				return;
			}

			button.disabled = true;
			button.textContent = "Processing...";
			button.style.backgroundColor = "#a6a6a6";

			try {
				// Extract PR info
				const prInfo = extractPRInfo();
				if (!prInfo) {
					throw new Error("Could not extract PR information from URL");
				}

				console.log(`${LOG_PREFIX} PR Info:`, prInfo);

				// Get repository ID
				const repositoryId = await getRepositoryId(prInfo.organization, prInfo.project, prInfo.repository);
				console.log(`${LOG_PREFIX} Repository ID: ${repositoryId}`);

				// Fetch comment threads from API
				const threads = await fetchCommentThreads(
					prInfo.organization,
					prInfo.project,
					repositoryId,
					prInfo.pullRequestId
				);

				// Filter for SonarQube comments that need to be closed (not already Closed)
				const commentsToClose = filterActiveSonarQubeComments(threads);

				if (commentsToClose.length === 0) {
					console.log(`${LOG_PREFIX} No SonarQube comments to close - all are already closed`);
					showNotification(`No SonarQube comments to close.\nAll comments are already closed.`, "info");
					return;
				}

				console.log(`${LOG_PREFIX} Found ${commentsToClose.length} SonarQube comment(s) to close`);

				// Process each comment sequentially using API
				let successCount = 0;
				let failedThreads = [];
				for (let i = 0; i < commentsToClose.length; i++) {
					const commentInfo = commentsToClose[i];
					console.log(`${LOG_PREFIX} Processing ${i + 1}/${commentsToClose.length} (thread ${commentInfo.threadId}, current status: ${commentInfo.statusName})`);

					// Update status via API REST
					const success = await updateThreadStatus(
						prInfo.organization,
						prInfo.project,
						repositoryId,
						prInfo.pullRequestId,
						commentInfo.threadId
					);

					if (success) {
						successCount++;
					} else {
						failedThreads.push(commentInfo.threadId);
						console.warn(`${LOG_PREFIX} Failed to close thread ${commentInfo.threadId}`);
					}

					// Small delay between API calls to avoid rate limiting
					await new Promise((resolve) => setTimeout(resolve, 200));
				}

				console.log(`${LOG_PREFIX} ✓ Completed! Closed ${successCount}/${commentsToClose.length} comment(s)`);

				if (failedThreads.length > 0) {
					console.warn(`${LOG_PREFIX} Failed threads: ${failedThreads.join(", ")}`);
				}

				if (successCount === commentsToClose.length) {
					showNotification(`✓ Successfully closed ${successCount} SonarQube comment(s)`, "success");
				} else if (successCount === 0) {
					showNotification(`Failed to close any of the ${commentsToClose.length} SonarQube comment(s).\nCheck console for errors.`, "error");
				} else {
					showNotification(`Closed ${successCount} out of ${commentsToClose.length} SonarQube comment(s).\n${failedThreads.length} failed.`, "info");
				}
			} catch (error) {
				console.error(`${LOG_PREFIX} Error:`, error);
				showNotification(`Error: ${error.message}`, "error");
			} finally {
				button.disabled = false;
				button.textContent = "Close SonarCloud Comments";
				button.style.backgroundColor = "#0078d4";
			}
		});

		// Insert button into toolbar
		try {
			toolbar.appendChild(button);
			console.log(`${LOG_PREFIX} ✓ Button created and inserted successfully`);
		} catch (error) {
			console.error(`${LOG_PREFIX} Error inserting button:`, error);
		}
	}

	// Initialize
	function init() {
		console.log(`${LOG_PREFIX} Script initialized (API version)`);
		console.log(`${LOG_PREFIX} Current URL: ${window.location.href}`);

		setTimeout(() => {
			console.log(`${LOG_PREFIX} Attempting to create button...`);
			createButton();
		}, 2000);

		// Retry button creation with more attempts
		let retries = 0;
		const maxRetries = 10;
		const checkButton = setInterval(() => {
			const existingButton = document.getElementById("close-sonar-cloud-btn");
			if (existingButton) {
				console.log(`${LOG_PREFIX} Button found, stopping retries`);
				clearInterval(checkButton);
			} else if (retries >= maxRetries) {
				console.warn(`${LOG_PREFIX} Max retries reached (${maxRetries}), stopping`);
				clearInterval(checkButton);
			} else {
				retries++;
				console.log(`${LOG_PREFIX} Retry ${retries}/${maxRetries} to create button...`);
				createButton();
			}
		}, 1000);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
