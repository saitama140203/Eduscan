"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Page Not Found</CardTitle>
          <CardDescription>The page you're looking for doesn't exist or has been moved.</CardDescription>
        </CardHeader>

        <CardFooter className="flex gap-2 justify-center">
          <Button asChild variant="default" className="flex items-center gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button onClick={() => window.history.back()} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
