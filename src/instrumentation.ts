export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { container } = await import("@/lib/container");
    container.queue.startWorker();
  }
}
