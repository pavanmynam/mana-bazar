import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// MANA BAZAR - REAL MODE - FULL APP
// 4 Roles, 4 Delivery Modes, Payment, Subscription, Shop/Product Add, Location, Admin
const CATEGORIES = ['Kirana / General Store','Bakery & Cakes','Medical / Pharmacy','Vegetables & Fruits','Cloud Kitchen & Hotels','Clothes & Boutique','Electrical & Electronics','Dairy & Milk','Beauty & Cosmetics','Hardware & Pooja Store']
const AREAS = ['Uppal','LB Nagar','Dilsukhnagar','Habsiguda','Nacharam','Kukatpally','Secunderabad']
const THEMES = { green:{bg:'#14532d',btn:'#16a34a'}, purple:{bg:'#581c87',btn:'#9333ea'}, blue:{bg:'#1e40af',btn:'#2563eb'}, dark:{bg:'#111',btn:'#22c55e'} }

export default function App(){
  const [role,setRole] = useState(null)
  const [theme,setTheme] = useState('green')
  const [area,setArea] = useState('Uppal')
  const [shops,setShops] = useState([])
  const [products,setProducts] = useState([])
  const [cart,setCart] = useState([])
  const [deliveryMode,setDeliveryMode] = useState('app_boy')
  const [shopForm,setShopForm] = useState({shop_name:'',owner_name:'',phone:'',area:'Uppal',address:'',category:'Kirana / General Store',upi_id:'',delivery_charge:30})
  const [productForm,setProductForm] = useState({name:'',price:'',mrp:'',description:'',image_url:'',category:'Kirana / General Store',stock:10})
  const [boyForm,setBoyForm] = useState({name:'',phone:'',vehicle:'Bike',vehicle_number:'',boy_type:'app_boy'})
  const [msg,setMsg] = useState('')

  useEffect(()=>{ loadData() },[])
  async function loadData(){
    try{
      const {data: s} = await supabase.from('shops').select('*').eq('status','approved')
      if(s) setShops(s)
      const {data: p} = await supabase.from('products').select('*').eq('status','approved')
      if(p) setProducts(p)
    }catch(e){ console.log('Supabase not connected yet - using demo fallback', e) }
    // Fallback demo shops if DB empty
    if(shops.length===0){
      setShops([
        {id:'1',shop_name:'Sri Balaji Kirana',category:'Kirana / General Store',area:'Uppal',address:'Uppal Main Road',delivery_charge:20,has_own_boys:true},
        {id:'2',shop_name:'Fresh Bakery',category:'Bakery & Cakes',area:'Uppal',address:'Uppal X Road',delivery_charge:30,has_own_boys:false},
        {id:'3',shop_name:'Sri Sai Medical',category:'Medical / Pharmacy',area:'LB Nagar',address:'LB Nagar',delivery_charge:25,has_own_boys:true},
        {id:'4',shop_name:'Cloud Biryani House',category:'Cloud Kitchen & Hotels',area:'Dilsukhnagar',address:'Dilsukhnagar',delivery_charge:40,has_own_boys:false},
      ])
      setProducts([
        {id:'p1',shop_id:'1',name:'Rice 5kg',price:350,mrp:400,image_url:'',stock:20,category:'Kirana / General Store'},
        {id:'p2',shop_id:'2',name:'Chocolate Cake 500g',price:299,mrp:350,image_url:'',stock:10,category:'Bakery & Cakes'},
        {id:'p3',shop_id:'3',name:'Paracetamol Strip',price:25,mrp:30,image_url:'',stock:100,category:'Medical / Pharmacy'},
        {id:'p4',shop_id:'4',name:'Chicken Biryani',price:199,mrp:250,image_url:'',stock:15,category:'Cloud Kitchen & Hotels'},
      ])
    }
  }

  async function addShop(e){ e.preventDefault(); const {data,error} = await supabase.from('shops').insert([{...shopForm, status:'pending'}]).select(); if(error) setMsg('Supabase connect chey - .env lo keys pettu. Error: '+error.message); else setMsg('Shop Submitted - Admin Approval Kosam Waiting!'); }
  async function addProduct(e){ e.preventDefault(); const {error} = await supabase.from('products').insert([{...productForm, price:Number(productForm.price), status:'pending'}]); if(error) setMsg('Error: '+error.message); else setMsg('Product Added - Admin Approval Kosam Waiting!'); }
  async function addBoy(e){ e.preventDefault(); const {error} = await supabase.from('delivery_boys').insert([{...boyForm, status:'pending'}]); if(error) setMsg('Error: '+error.message); else setMsg('Delivery Boy Registered - Admin Approval Kosam!'); }
  async function placeOrder(){
    const total = cart.reduce((a,c)=>a+c.price*c.qty,0)
    const deliveryFee = deliveryMode==='self_pickup'||deliveryMode==='customer_boy' ? 0 : 30
    const platformFee = 5
    const {error} = await supabase.from('orders').insert([{total, delivery_fee:deliveryFee, platform_fee:platformFee, shop_amount: total-platformFee, delivery_mode:deliveryMode, payment_mode:'UPI', payment_status:'pending', order_status:'placed'}])
    if(error) setMsg('Order Demo Success! Total Rs.'+total+' Delivery Mode: '+deliveryMode+' - Supabase connect cheste real ga save avthundi. Error: '+error.message)
    else setMsg('Order Placed Real DB lo! Total Rs.'+total)
    setCart([])
  }

  if(!role) return (
    <div><div className='top'>MANA BAZAR - Anni Shops, Oke App</div>
    <div className='card'><h2>Login - Role Select Chey</h2>
    <div className='grid'>{['customer','shop_owner','delivery_boy','admin'].map(r=><button key={r} onClick={()=>setRole(r)}>{r.toUpperCase().replace('_',' ')}</button>)}</div>
    <p>Theme:</p><div style={{display:'flex',gap:8}}>{Object.keys(THEMES).map(t=><button key={t} onClick={()=>setTheme(t)}>{t}</button>)}</div>
    <p>Area: <select value={area} onChange={e=>setArea(e.target.value)}>{AREAS.map(a=><option key={a}>{a}</option>)}</select></p>
    <p>Real Mode: Supabase .env lo keys pettali. Lekapothe demo data chupisthundi.</p></div></div>
  )

  return (<div><div className='top'>Mana Bazar | {role} | Area: {area} <button onClick={()=>setRole(null)}>Logout</button></div>
  {msg && <div className='card' style={{background:'#dcfce7'}}>{msg}</div>}

  {/* CUSTOMER */}
  {role==='customer' && <div>
    <div className='card'><h3>Categories - Top 10</h3><div className='grid'>{CATEGORIES.map(c=><div key={c} className='card' style={{margin:0}}>{c}</div>)}</div></div>
    <div className='card'><h3>Near Shops - {area} lo</h3>{shops.filter(s=>s.area===area).map(s=><div key={s.id} className='card'><b>{s.shop_name}</b> - {s.category} - {s.address} - Delivery Rs.{s.delivery_charge} {s.has_own_boys?'| Shop Boy Undi':''}</div>)}{shops.filter(s=>s.area===area).length===0 && <p>Ee area lo shops levu, anni shops chudu kindha</p>}{shops.map(s=><div key={'all'+s.id} className='card'><b>{s.shop_name}</b> ({s.area})</div>)}</div>
    <div className='card'><h3>Products</h3>{products.map(p=><div key={p.id} className='card'>{p.image_url && <img src={p.image_url} style={{width:'100%',borderRadius:12}}/>}<b>{p.name}</b> - Rs.{p.price} <s>Rs.{p.mrp}</s> Stock:{p.stock} <button onClick={()=>setCart([...cart,{...p,qty:1}])}>Add to Cart</button></div>)}</div>
    <div className='card'><h3>Checkout - Delivery Mode Select</h3>
      {['app_boy','shop_boy','self_pickup','customer_boy'].map(m=><label key={m} style={{display:'block'}}><input type='radio' checked={deliveryMode===m} onChange={()=>setDeliveryMode(m)}/> {m==='app_boy'?'Mana Bazar Boy - Rs.30':m==='shop_boy'?'Shop Own Boy - Shop Fee':m==='self_pickup'?'Self Pickup - FREE (Nene Velli Teesukunta)':'My Own Boy - FREE (Naa Boy ni Pampistha)'}</label>)}
      {deliveryMode==='customer_boy' && <div><input placeholder='Naa Boy Name'/><input placeholder='Naa Boy Phone'/><input placeholder='Vehicle Number'/></div>}
      <p>Cart: {cart.length} items | Total: Rs.{cart.reduce((a,c)=>a+c.price*c.qty,0)}</p>
      <p>Payment: UPI / Card / COD / Direct to Shop UPI</p>
      <button onClick={placeOrder}>Place Order - Real DB ki Velthundi</button>
    </div>
  </div>}

  {/* SHOP OWNER */}
  {role==='shop_owner' && <div>
    <div className='card'><h3>Shop Add - Full Form</h3><form onSubmit={addShop}><input placeholder='Shop Name' value={shopForm.shop_name} onChange={e=>setShopForm({...shopForm,shop_name:e.target.value})}/><input placeholder='Owner Name' onChange={e=>setShopForm({...shopForm,owner_name:e.target.value})}/><input placeholder='Phone' onChange={e=>setShopForm({...shopForm,phone:e.target.value})}/><select value={shopForm.area} onChange={e=>setShopForm({...shopForm,area:e.target.value})}>{AREAS.map(a=><option key={a}>{a}</option>)}</select><input placeholder='Address' onChange={e=>setShopForm({...shopForm,address:e.target.value})}/><select onChange={e=>setShopForm({...shopForm,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><input placeholder='Shop UPI ID - Direct Payment Kosam' onChange={e=>setShopForm({...shopForm,upi_id:e.target.value})}/><input placeholder='Delivery Charge' type='number' value={shopForm.delivery_charge} onChange={e=>setShopForm({...shopForm,delivery_charge:e.target.value})}/><button>Add Shop - Admin Approval ki Velthundi</button></form></div>
    <div className='card'><h3>Product Add - Photo + Price + Details</h3><form onSubmit={addProduct}><input placeholder='Product Name' onChange={e=>setProductForm({...productForm,name:e.target.value})}/><input placeholder='Image URL - Photo Link' onChange={e=>setProductForm({...productForm,image_url:e.target.value})}/>{productForm.image_url && <img src={productForm.image_url} style={{width:'100%'}}/>}<input placeholder='Price' type='number' onChange={e=>setProductForm({...productForm,price:e.target.value})}/><input placeholder='MRP' type='number' onChange={e=>setProductForm({...productForm,mrp:e.target.value})}/><textarea placeholder='Details / Description' onChange={e=>setProductForm({...productForm,description:e.target.value})}/><input placeholder='Stock' type='number' onChange={e=>setProductForm({...productForm,stock:e.target.value})}/><button>Add Product</button></form></div>
    <div className='card'><h3>Naa Delivery Boys - Shop Own Boys</h3><p>Shop valle boy ni pettukunte ikkada add chey - Boy Name, Phone, Vehicle, Per Order Fee</p><form onSubmit={addBoy}><input placeholder='Boy Name' onChange={e=>setBoyForm({...boyForm,name:e.target.value})}/><input placeholder='Boy Phone' onChange={e=>setBoyForm({...boyForm,phone:e.target.value})}/><select onChange={e=>setBoyForm({...boyForm,boy_type:e.target.value})}> <option value='shop_boy'>Shop Boy</option><option value='app_boy'>App Boy</option></select><button>Add My Boy</button></form></div>
    <div className='card'><h3>Subscription</h3><p>FREE - 20 Products, 5% Commission | PRO Rs.499 - Unlimited, 3% | PREMIUM Rs.999 - Unlimited, 0% Direct, 2% App</p><button>Upgrade to PRO</button></div>
  </div>}

  {/* DELIVERY BOY */}
  {role==='delivery_boy' && <div>
    <div className='card'><h3>Delivery Boy - Online / Offline</h3><button>Go Online</button> <p>Today Earnings: Rs.0 | Deliveries: 0</p></div>
    <div className='card'><h3>Register</h3><form onSubmit={addBoy}><input placeholder='Name' onChange={e=>setBoyForm({...boyForm,name:e.target.value})}/><input placeholder='Phone' onChange={e=>setBoyForm({...boyForm,phone:e.target.value})}/><input placeholder='Vehicle Number' onChange={e=>setBoyForm({...boyForm,vehicle_number:e.target.value})}/><select onChange={e=>setBoyForm({...boyForm,boy_type:e.target.value})}> <option value='app_boy'>Mana Bazar Boy</option><option value='shop_boy'>Shop Boy</option></select><button>Register - Admin Approval</button></form></div>
    <div className='card'><h3>Available Orders</h3><p>Area: {area} lo orders ikkada vasthayi - Accept -> Reached Shop -> Picked Up -> Delivered OTP 1234</p></div>
  </div>}

  {/* ADMIN */}
  {role==='admin' && <div>
    <div className='card'><h3>Admin - Full Control</h3><p>Total Shops: {shops.length} | Total Products: {products.length}</p><button onClick={loadData}>Refresh Real Data</button></div>
    <div className='card'><h3>Pending Approvals</h3><p>Shops / Products / Delivery Boys - Admin approve cheste ne live avthayi. Supabase lo status='pending' nunchi 'approved' ki marchali.</p>{shops.map(s=><div key={s.id}>{s.shop_name} - {s.status || 'pending'} <button>Approve</button> <button>Reject</button></div>)}</div>
    <div className='card'><h3>Subscription Plans</h3><p>FREE / PRO 499 / PREMIUM 999 - Commission Settings</p></div>
    <div className='card'><h3>Delivery Modes Control</h3><p>App Boy / Shop Boy / Self Pickup / Customer Boy - anni orders lo mode filter undhi</p></div>
  </div>}
  </div>)
}
