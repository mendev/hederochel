import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SetupChecklist } from "@/components/setup-checklist"
import { ApiTester } from "@/components/api-tester"
import { UsersList } from "@/components/users-list"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">React + Vercel Serverless + Supabase</h1>
          <p className="text-muted-foreground">
            A working example demonstrating how to use serverless functions with Supabase
          </p>
        </div>

        <div className="mb-8">
          <SetupChecklist />
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users List</TabsTrigger>
            <TabsTrigger value="api-tester">API Tester</TabsTrigger>
            <TabsTrigger value="guide">Quick Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersList />
          </TabsContent>

          <TabsContent value="api-tester">
            <ApiTester />
          </TabsContent>

          <TabsContent value="guide">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <div className="rounded-lg border bg-card p-6 space-y-6">
                <section>
                  <h3 className="text-lg font-semibold mb-2">1. Set Up Environment Variables</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a <code className="bg-muted px-1.5 py-0.5 rounded">.env.local</code> file in your project
                    root:
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {`# Public (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...`}
                  </pre>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">2. Restart Development Server</h3>
                  <p className="text-sm text-muted-foreground">
                    After creating <code className="bg-muted px-1.5 py-0.5 rounded">.env.local</code>, restart with{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded">npm run dev</code>
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">3. Test the API Routes</h3>
                  <p className="text-sm text-muted-foreground mb-3">Available endpoints:</p>
                  <ul className="text-sm space-y-2">
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">GET /api/health</code> - Health check
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">GET /api/users</code> - List all users (admin)
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">GET /api/me</code> - Current user
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">GET/POST /api/example</code> - Example patterns
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">4. Key Files to Explore</h3>
                  <ul className="text-sm space-y-2">
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">lib/supabase/client.ts</code> - Browser client
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">lib/supabase/server.ts</code> - Server/admin
                      client
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">app/api/users/route.ts</code> - Admin API example
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">docs/serverless-guide.md</code> - Full
                      documentation
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
