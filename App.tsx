
import { supabase } from './services/supabaseService';
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, MessageSquare, Send, Plus, Search, X, Edit2, Globe, User as UserIcon, QrCode, RefreshCw, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { Customer, Message } from './types';
import { SupabaseService } from './services/supabaseService';
import { EvolutionService } from './services/evolutionService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'customers' | 'settings' | 'connection'>('chat');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [evoConfig, setEvoConfig] = useState({
    url: localStorage.getItem('evo_url') || '',
    key: localStorage.getItem('evo_key') || '',
    instance: localStorage.getItem('evo_instance') || ''
  });

  const [connectionStatus, setConnectionStatus] = useState<string>('UNKNOWN');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filtered customers based on search query
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    customer.phone.includes(searchQuery)
  );

  useEffect(() => {
    loadCustomers();
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    if (evoConfig.url && evoConfig.key && evoConfig.instance) {
      try {
        const status = await EvolutionService.getConnectionStatus(evoConfig.url, evoConfig.key, evoConfig.instance);
        setConnectionStatus(status.instance?.state || 'DISCONNECTED');
        if (status.instance?.state === 'CONNECTED') setQrCodeData(null);
      } catch (e) {
        setConnectionStatus('DISCONNECTED');
      }
    }
  };

  const handleConnect = async () => {
    setLoadingQr(true);
    try {
      // Tenta criar a instância caso não exista
      await EvolutionService.createInstance(evoConfig.url, evoConfig.key, evoConfig.instance);
      const data = await EvolutionService.getQrCode(evoConfig.url, evoConfig.key, evoConfig.instance);
      if (data.base64) {
        setQrCodeData(data.base64);
      } else if (data.code) {
        setQrCodeData(data.code); // Fallback caso venha em outro formato
      }
    } catch (e) {
      console.error("Erro ao conectar:", e);
      alert("Erro ao gerar QR Code. Verifique se a URL da API está correta.");
    } finally {
      setLoadingQr(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp?")) return;
    try {
      await EvolutionService.logoutInstance(evoConfig.url, evoConfig.key, evoConfig.instance);
      setConnectionStatus('DISCONNECTED');
      setQrCodeData(null);
    } catch (e) { alert("Erro ao deslogar."); }
  };

  useEffect(() => {
    if (!selectedCustomer) return;
    loadMessages(selectedCustomer.id);
    const channel = supabase
      .channel(`chat-${selectedCustomer.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `customer_id=eq.${selectedCustomer.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCustomer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCustomers = async () => {
    const data = await SupabaseService.getCustomers();
    setCustomers(data);
  };

  const loadMessages = async (customerId: string) => {
    const data = await SupabaseService.getMessages(customerId);
    setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCustomer) return;
    if (connectionStatus !== 'CONNECTED') {
      alert("WhatsApp não está conectado!");
      return;
    }

    const currentText = newMessage;
    setNewMessage('');
    const msgData = { customer_id: selectedCustomer.id, content: currentText, from_me: true, status: 'sent' };

    try {
      const savedMsg = await SupabaseService.saveMessage(msgData);
      setMessages(prev => [...prev, savedMsg]);
      await EvolutionService.sendMessage(evoConfig.url, evoConfig.key, evoConfig.instance, selectedCustomer.phone, currentText);
    } catch (err: any) { console.error(err); }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <aside className="w-16 bg-slate-900 flex flex-col items-center py-6 space-y-8 shadow-xl z-20">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">E</div>
        <nav className="flex flex-col space-y-4 text-slate-400">
          <button onClick={() => setActiveTab('chat')} className={`p-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Chat"><MessageSquare size={20} /></button>
          <button onClick={() => setActiveTab('connection')} className={`p-3 rounded-xl transition-all ${activeTab === 'connection' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Conectar WhatsApp"><QrCode size={20} /></button>
          <button onClick={() => setActiveTab('customers')} className={`p-3 rounded-xl transition-all ${activeTab === 'customers' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Clientes"><Users size={20} /></button>
          <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Ajustes"><Settings size={20} /></button>
        </nav>
        <div className="mt-auto">
          <div className={`w-3 h-3 rounded-full shadow-sm ${connectionStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
      </aside>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-indigo-600 mb-4 uppercase tracking-wider text-[10px] font-black">
              {activeTab === 'chat' ? 'Conversas Ativas' : activeTab === 'connection' ? 'Conectividade' : activeTab === 'customers' ? 'Meus Clientes' : 'Configurações'}
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'connection' ? (
              <div className="p-6 space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
                  <h3 className="font-bold text-slate-800">Status do WhatsApp</h3>
                  <div className="flex flex-col items-center">
                    {connectionStatus === 'CONNECTED' ? (
                      <div className="flex flex-col items-center text-green-600 space-y-2">
                        <CheckCircle2 size={48} />
                        <span className="font-bold uppercase text-xs">Conectado</span>
                        <button onClick={handleLogout} className="mt-4 flex items-center gap-2 text-red-500 hover:text-red-700 text-xs font-bold"><LogOut size={14}/> Desconectar</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 space-y-4">
                        <AlertCircle size={48} className="text-amber-500" />
                        <span className="font-bold uppercase text-xs">Desconectado</span>
                        
                        {qrCodeData ? (
                          <div className="bg-white p-2 rounded-lg shadow-md border border-slate-200">
                             <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48" />
                             <p className="text-[10px] text-slate-500 mt-2">Aponte a câmera do WhatsApp</p>
                          </div>
                        ) : (
                          <button 
                            onClick={handleConnect} 
                            disabled={loadingQr || !evoConfig.url}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-xs hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            {loadingQr ? <RefreshCw className="animate-spin" size={14}/> : <QrCode size={14}/>}
                            GERAR QR CODE
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed bg-indigo-50 p-4 rounded-xl border border-indigo-100 italic">
                  * Utilize uma instância dedicada para este CRM. O QR Code expira em alguns segundos.
                </div>
              </div>
            ) : activeTab !== 'settings' ? (
              filteredCustomers.map(customer => (
                <button key={customer.id} onClick={() => { setSelectedCustomer(customer); if(activeTab !== 'chat') setActiveTab('chat'); }} className={`w-full group flex items-center border-b border-slate-50 hover:bg-slate-50 transition-all ${selectedCustomer?.id === customer.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
                  <div className="flex-1 p-4 flex items-center space-x-4 text-left">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0"><UserIcon size={20} /></div>
                    <div className="flex-1 overflow-hidden">
                      <span className="font-semibold text-slate-800 truncate block text-sm">{customer.name}</span>
                      <p className="text-xs text-slate-500 truncate">{customer.phone}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Servidor API</h3>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="URL da API Evolution" value={evoConfig.url} onChange={e => setEvoConfig({...evoConfig, url: e.target.value})} />
                  <input type="password" title="Global API Key" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Global API Key" value={evoConfig.key} onChange={e => setEvoConfig({...evoConfig, key: e.target.value})} />
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome da Instância" value={evoConfig.instance} onChange={e => setEvoConfig({...evoConfig, instance: e.target.value})} />
                  <button onClick={() => {localStorage.setItem('evo_url', evoConfig.url); localStorage.setItem('evo_key', evoConfig.key); localStorage.setItem('evo_instance', evoConfig.instance); checkConnection(); alert("Configurações salvas!");}} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors">Salvar Ajustes</button>
                </div>
              </div>
            )}
          </div>
          {(activeTab === 'customers' || activeTab === 'chat') && (
            <button onClick={() => { setCustomerForm({name:'', phone:''}); setShowAddModal(true); }} className="m-4 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium shadow-md transition-all active:scale-95"><Plus size={18} /><span>Novo Cliente</span></button>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white">
          {selectedCustomer ? (
            <>
              <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><UserIcon size={20} /></div>
                  <div>
                    <h2 className="font-bold text-slate-800 leading-tight">{selectedCustomer.name}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{selectedCustomer.phone}</span>
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                </div>
                <button onClick={() => {setCustomerForm({name: selectedCustomer.name, phone: selectedCustomer.phone}); setShowEditModal(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={18}/></button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${msg.from_me ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`text-[9px] mt-1 text-right font-medium ${msg.from_me ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <footer className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <input type="text" placeholder={connectionStatus === 'CONNECTED' ? "Escreva aqui..." : "WhatsApp desconectado..."} disabled={connectionStatus !== 'CONNECTED'} className="flex-1 bg-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm disabled:opacity-50" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                  <button onClick={handleSendMessage} disabled={connectionStatus !== 'CONNECTED'} className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-400"><Send size={20} /></button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300"><MessageSquare size={48} /></div>
              <h2 className="text-xl font-bold text-slate-600">Central de Atendimento</h2>
              <p className="text-sm max-w-xs mt-2">Conecte seu WhatsApp na aba lateral e selecione um cliente para conversar.</p>
            </div>
          )}
        </div>
      </main>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 uppercase text-xs tracking-widest">{showEditModal ? 'Editar Contato' : 'Cadastrar Cliente'}</h3>
              <button onClick={() => {setShowAddModal(false); setShowEditModal(false);}} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={showEditModal ? async (e) => { e.preventDefault(); if(!selectedCustomer) return; setLoading(true); const upd = await SupabaseService.updateCustomer(selectedCustomer.id, customerForm.name, customerForm.phone); setCustomers(c => c.map(i => i.id === upd.id ? upd : i)); setSelectedCustomer(upd); setShowEditModal(false); setLoading(false); } : async (e) => { e.preventDefault(); setLoading(true); const add = await SupabaseService.addCustomer(customerForm.name, customerForm.phone); setCustomers(c => [...c, add]); setShowAddModal(false); setLoading(false); }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome Completo</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">WhatsApp (DDI + DDD + Número)</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="5511999999999" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg uppercase text-xs tracking-widest">
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
