import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminGate, AuthProvider } from './auth'
import Shell from './components/Shell'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Login from './pages/Login'
import OrderPage from './pages/OrderPage'
import Orders from './pages/Orders'
import Payments from './pages/Payments'
import ProductEditor from './pages/ProductEditor'
import Products from './pages/Products'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminGate />}>
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="categories" element={<Categories />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderPage />} />
              <Route path="payments" element={<Payments />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
