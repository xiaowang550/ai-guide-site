import Link from 'next/link'
import { Compass, Home, Search } from 'lucide-react'
import { primaryNav } from '@/lib/site'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">这个页面不存在，或者已经被我们改了</h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
        AI 领域变化快，我们也可能下架了某个工具页。可以先回首页，或者直接描述需求让决策器帮你选。
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4" aria-hidden />
            回首页
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/find">
            <Compass className="h-4 w-4" aria-hidden />
            打开场景决策器
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">
            <Search className="h-4 w-4" aria-hidden />
            全站搜索
          </Link>
        </Button>
      </div>
      <nav aria-label="主导航" className="mt-10">
        <ul className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:text-foreground hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}