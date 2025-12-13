# Building React Apps with Vercel Serverless Functions & Supabase

## Table of Contents
1. [Understanding the Architecture](#1-understanding-the-architecture)
2. [Project Structure](#2-project-structure)
3. [Setting Up Your Development Environment](#3-setting-up-your-development-environment)
4. [Creating Serverless API Routes](#4-creating-serverless-api-routes)
5. [Connecting to Supabase from Serverless Functions](#5-connecting-to-supabase-from-serverless-functions)
6. [Frontend Integration](#6-frontend-integration)
7. [Local Development Workflow](#7-local-development-workflow)
8. [Security Best Practices](#8-security-best-practices)
9. [Deploying to Vercel](#9-deploying-to-vercel)
10. [Common Patterns & Examples](#10-common-patterns--examples)

---

## 1. Understanding the Architecture

### Why Serverless Functions?

When building with Supabase, you can do many things directly from the frontend:
- **Direct client access**: Reading public data, user authentication
- **Row Level Security (RLS)**: Protecting data based on user context

However, some operations **require a backend**:
- **Admin operations**: Listing all users, managing roles
- **Service role access**: Operations that bypass RLS
- **Sensitive logic**: Payment processing, sending emails
- **Third-party API calls**: Hiding API keys from the client

### The Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        Your App                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐         ┌──────────────────────────┐     │
│   │   React      │  HTTP   │   Vercel Serverless      │     │
│   │   Frontend   │ ──────► │   Functions (API Routes) │     │
│   │              │         │                          │     │
│   │  - UI/UX     │         │  - /api/users            │     │
│   │  - Auth UI   │         │  - /api/admin/*          │     │
│   │  - Data      │         │  - /api/protected/*      │     │
│   │    Display   │         │                          │     │
│   └──────┬───────┘         └────────────┬─────────────┘     │
│          │                              │                    │
│          │ Supabase Client              │ Supabase Admin     │
│          │ (anon key)                   │ (service role key) │
│          │                              │                    │
└──────────┼──────────────────────────────┼────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Database   │  │    Auth     │  │   Storage           │  │
│  │  (Postgres) │  │   Service   │  │   (Files/Images)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### Two Types of Supabase Clients

| Client Type | Key Used | Where to Use | Can Bypass RLS? |
|-------------|----------|--------------|-----------------|
| **Browser Client** | `anon` (public) key | Frontend | No |
| **Admin Client** | `service_role` key | Serverless only | Yes |

> ⚠️ **NEVER expose the `service_role` key in frontend code!**

---

## 2. Project Structure

### Next.js App Router Structure (Recommended)

\`\`\`
my-app/
├── app/
│   ├── api/                    # Serverless API routes
│   │   ├── users/
│   │   │   └── route.ts        # GET /api/users
│   │   ├── admin/
│   │   │   └── users/
│   │   │       └── route.ts    # Admin user management
│   │   └── protected/
│   │       └── route.ts        # Auth-protected endpoint
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── dashboard/
│       └── page.tsx            # Dashboard page
├── components/
│   └── ...                     # React components
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── admin.ts            # Admin Supabase client (service role)
│   └── ...
├── .env.local                  # Local environment variables
└── package.json
\`\`\`

---

## 3. Setting Up Your Development Environment

### Prerequisites

1. **Node.js** (v18 or later)
2. **npm** or **yarn** or **pnpm**
3. **A Supabase project** with your database set up

### Step 1: Create a Next.js Project

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
\`\`\`

Choose these options:
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ App Router
- ❌ src/ directory (optional)

### Step 2: Install Supabase Packages

\`\`\`bash
npm install @supabase/supabase-js @supabase/ssr
\`\`\`

### Step 3: Set Up Environment Variables

Create a `.env.local` file in your project root:

\`\`\`env
# Public keys (safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret keys (NEVER expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

> 📍 Find these in your Supabase Dashboard → Settings → API

---

## 4. Creating Serverless API Routes

### What is a Route Handler?

In Next.js App Router, **Route Handlers** are serverless functions. They:
- Run on the server (not in the browser)
- Can access secret environment variables
- Can perform admin operations
- Are located in the `app/api/` directory

### Basic Route Handler Structure

\`\`\`typescript
// app/api/hello/route.ts

import { NextRequest, NextResponse } from 'next/server'

// GET request handler
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello from serverless!' })
}

// POST request handler
export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ received: body })
}

// Other HTTP methods: PUT, DELETE, PATCH, HEAD, OPTIONS
\`\`\`

### HTTP Methods Mapping

| File Export | HTTP Method | Use Case |
|-------------|-------------|----------|
| `GET` | GET | Fetch data |
| `POST` | POST | Create data |
| `PUT` | PUT | Replace data |
| `PATCH` | PATCH | Update data |
| `DELETE` | DELETE | Delete data |

### Route Parameters (Dynamic Routes)

\`\`\`typescript
// app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  return NextResponse.json({ userId: id })
}
\`\`\`

---

## 5. Connecting to Supabase from Serverless Functions

### Setting Up Supabase Clients

#### Browser Client (for frontend)

\`\`\`typescript
// lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return client
}
\`\`\`

#### Server Client (for Server Components & Route Handlers)

\`\`\`typescript
// lib/supabase/server.ts

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
\`\`\`

#### Admin Client (for privileged operations)

\`\`\`typescript
// lib/supabase/admin.ts

import { createClient } from '@supabase/supabase-js'

// This client bypasses RLS - use carefully!
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
\`\`\`

### Example: List All Users (Admin Operation)

\`\`\`typescript
// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // 1. Verify the requesting user is authenticated and is an admin
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // 2. Check if user has admin role (example: checking a profile table)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    )
  }
  
  // 3. Use admin client to list all users
  const adminClient = createAdminClient()
  const { data: { users }, error } = await adminClient.auth.admin.listUsers()
  
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  
  // 4. Return sanitized user list
  const sanitizedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }))
  
  return NextResponse.json({ users: sanitizedUsers })
}
\`\`\`

---

## 6. Frontend Integration

### Calling API Routes from React

#### Using fetch

\`\`\`typescript
// components/user-list.tsx
'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  created_at: string
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users')
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch users')
        }
        
        const data = await response.json()
        setUsers(data.users)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.email}</li>
      ))}
    </ul>
  )
}
\`\`\`

#### Using SWR (Recommended)

\`\`\`typescript
// components/user-list-swr.tsx
'use client'

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch')
  }
  return res.json()
}

export function UserListSWR() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/users', fetcher)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <button onClick={() => mutate()}>Refresh</button>
      <ul>
        {data.users.map((user: any) => (
          <li key={user.id}>{user.email}</li>
        ))}
      </ul>
    </div>
  )
}
\`\`\`

---

## 7. Local Development Workflow

### Running the Development Server

\`\`\`bash
npm run dev
\`\`\`

This starts your Next.js development server at `http://localhost:3000`

### Key Points for Local Development

1. **API routes work automatically** - No separate server needed!
2. **Hot reload** - Changes to API routes and components reload automatically
3. **Environment variables** - `.env.local` is loaded automatically
4. **Same URLs** - `/api/users` works the same locally and in production

### Testing API Routes

#### Using curl

\`\`\`bash
# GET request
curl http://localhost:3000/api/users

# POST request with JSON body
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
\`\`\`

#### Using VS Code REST Client Extension

Create a file `api.http`:

\`\`\`http
### Get all users
GET http://localhost:3000/api/admin/users

### Create a user
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "Test User"
}
\`\`\`

### Debugging Tips

1. **Console logs appear in terminal** (not browser)
   \`\`\`typescript
   export async function GET() {
     console.log('This appears in your terminal!')
     return NextResponse.json({ ok: true })
   }
   \`\`\`

2. **Check Network tab** in browser DevTools for request/response details

3. **Use proper error handling** to see what's failing

---

## 8. Security Best Practices

### ✅ DO

1. **Always verify authentication** in protected routes
   \`\`\`typescript
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   \`\`\`

2. **Check authorization** (user has permission for the action)
   \`\`\`typescript
   if (user.id !== resourceOwnerId) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   \`\`\`

3. **Validate input data**
   \`\`\`typescript
   const body = await request.json()
   if (!body.email || !isValidEmail(body.email)) {
     return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
   }
   \`\`\`

4. **Use parameterized queries** (Supabase does this automatically)

5. **Limit returned data** - Don't send more than needed

### ❌ DON'T

1. **Never expose service role key** in frontend code
2. **Never trust client-side data** without validation
3. **Never skip authentication checks** on protected routes
4. **Never return sensitive user data** (passwords, tokens, etc.)

---

## 9. Deploying to Vercel

### Step 1: Push to GitHub

\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
\`\`\`

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js

### Step 3: Configure Environment Variables

In your Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |

### Step 4: Deploy

Click "Deploy" - Vercel will:
1. Build your Next.js app
2. Deploy static pages to CDN
3. Deploy API routes as serverless functions
4. Give you a production URL

### Automatic Deployments

After initial setup:
- **Push to main** → Production deployment
- **Push to other branches** → Preview deployments

---

## 10. Common Patterns & Examples

### Pattern 1: CRUD Operations

\`\`\`typescript
// app/api/posts/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET all posts
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: data })
}

// CREATE a post
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  
  const { data, error } = await supabase
    .from('posts')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data }, { status: 201 })
}
\`\`\`

\`\`\`typescript
// app/api/posts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ post: data })
}

// UPDATE post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('posts')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data })
}

// DELETE post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
\`\`\`

### Pattern 2: Protected Route with Role Check

\`\`\`typescript
// app/api/admin/stats/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  // 1. Get current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Get stats using admin client
  const admin = createAdminClient()
  
  const [usersResult, postsResult] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from('posts').select('id', { count: 'exact' })
  ])

  return NextResponse.json({
    totalUsers: usersResult.data?.users?.length ?? 0,
    totalPosts: postsResult.count ?? 0
  })
}
\`\`\`

### Pattern 3: Middleware for Auth

\`\`\`typescript
// middleware.ts

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Protect routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
}
\`\`\`

---

## Quick Reference

### File → URL Mapping

| File Location | URL |
|--------------|-----|
| `app/api/route.ts` | `/api` |
| `app/api/users/route.ts` | `/api/users` |
| `app/api/users/[id]/route.ts` | `/api/users/:id` |
| `app/api/admin/users/route.ts` | `/api/admin/users` |

### Response Helpers

\`\`\`typescript
// Success responses
NextResponse.json({ data }, { status: 200 })  // OK
NextResponse.json({ data }, { status: 201 })  // Created

// Error responses
NextResponse.json({ error: 'Bad Request' }, { status: 400 })
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
NextResponse.json({ error: 'Forbidden' }, { status: 403 })
NextResponse.json({ error: 'Not Found' }, { status: 404 })
NextResponse.json({ error: 'Server Error' }, { status: 500 })
\`\`\`

### Environment Variables

| Variable | Where to Use | Public? |
|----------|--------------|---------|
| `NEXT_PUBLIC_*` | Frontend & Backend | Yes |
| Without prefix | Backend only | No |

---

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY is undefined"
- Make sure it's in `.env.local` (not `.env`)
- Restart your dev server after adding env vars

### "401 Unauthorized" on API calls
- Check that cookies are being sent with requests
- Verify middleware is refreshing the session
- Check that the user is actually logged in

### "API route not found"
- File must be named `route.ts` (not `index.ts`)
- Check the folder structure matches the URL
- Make sure you're exporting the HTTP method function

### Local works but Vercel doesn't
- Add environment variables in Vercel dashboard
- Check build logs for errors
- Verify all dependencies are in `package.json`
