import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import routes from './routers/routes.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster/>
    <RouterProvider router={routes}/>
  </StrictMode>,
)
