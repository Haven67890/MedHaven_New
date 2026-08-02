"use client"

import JuthDashboard from "@/medhaven_juth_hub"

export default function DashboardPage() {
  return <JuthDashboard />
}

        <div className="flex flex-col gap-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Flame className="size-4 text-amber-500" aria-hidden="true" /> Exam countdown</CardTitle>
              <CardDescription>{examCountdown.subject}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight text-foreground">{examCountdown.daysLeft}</span>
                <span className="pb-1 text-sm text-muted-foreground">days remaining</span>
              </div>
              <Progress value={examProgress} indicatorClassName="bg-amber-500" />
              <p className="text-xs text-muted-foreground">{examProgress}% of the term elapsed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" aria-hidden="true" /> MedHaven AI</CardTitle>
              <CardDescription>{aiAssistantPreview.greeting}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <MessageSquare className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">Try one of these to get started:</p>
              </div>
              <div className="flex flex-col gap-2">
                {aiAssistantPreview.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/quizzes">Open AI assistant <ArrowRight data-icon="inline-end" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BellRing className="size-4 text-primary" aria-hidden="true" /> Announcements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {announcements.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="muted" className="shrink-0">{item.tag}</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  <span className="text-xs text-muted-foreground/70">{item.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study streak</CardTitle>
              <CardDescription>Subject progress this term</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {progressWidgets.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.value}%</span>
                  </div>
                  <Progress value={item.value} indicatorClassName={colorBar[item.color]} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" aria-hidden="true" /> Upcoming tutorials</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {upcomingTutorials.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="accent" className="shrink-0">{item.subject}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.tutor} · {item.time}</p>
                  <p className="text-xs text-muted-foreground/70">{item.seats}</p>
                </div>
              ))}
              <Button variant="outline" size="sm" asChild>
                <Link href="/tutorials">Browse tutorials <ArrowRight data-icon="inline-end" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
              <CardDescription>Your recent actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
                {activityTimeline.map((item) => {
                  const Icon = timelineIcons[item.icon]
                  return (
                    <li key={item.id} className="relative flex gap-3">
                      <span className="absolute -left-[1.4rem] flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                        <span className="text-xs text-muted-foreground/70">{item.time}</span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
