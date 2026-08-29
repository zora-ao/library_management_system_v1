import { useState } from "react"
import { Outlet } from "react-router-dom"
import Navbar from "./Navbar";



const MainLayout = () => {
  const [collapsed, setCollapse] = useState<boolean>(false);

  return (
    <div className="h-screen flex bg-background">
      <Navbar
        collapsed={collapsed}
        onToggle={() => setCollapse((prev) => !prev)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 p-6 md:px-7 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
