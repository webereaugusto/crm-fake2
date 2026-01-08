import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, MessageSquare, Send, Plus, Search, MoreVertical, Phone, User as UserIcon, Copy, Check, Database, X, Edit2, Globe } from 'lucide-react';
import { Customer, Message } from './types';
import { SupabaseService } from './services/supabaseService';
import { EvolutionService } from './services/evolutionService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'customers' | 'settings'>('chat');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Configurações Evolution
  const [evoConfig, setEvoConfig] = useState({
    url: localStorage.getItem('evo_url') || '',
    key: localStorage.getItem('evo_key') || '',
    instance: localStorage.getItem('evo_instance') || ''
  });

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadMessages(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveEvoSettings = () => {
    localStorage.setItem('evo_url', evoConfig.url);
    localStorage.setItem('evo_key', evoConfig.key);
    localStorage.setItem('evo_instance', evoConfig.instance);
    alert("Configurações da Evolution salvas com sucesso!");
  };

  const loadCustomers = async () => {
    try {
      const data = await SupabaseService.getCustomers();
      setCustomers(data);
    } catch (err) { console.error(err); }
  };

  const loadMessages = async (customerId: string) => {
    try {
      const data = await SupabaseService.getMessages(customerId);
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCustomer) return;

    // 1. Salvar no Supabase primeiro
    const msgData = {
      customer_id: selectedCustomer.id,
      content: newMessage,
      from_me: true,
      status: 'sent'
    };

    try {
      const savedMsg = await SupabaseService.saveMessage(msgData);
      setMessages(prev => [...prev, savedMsg]);
      const currentText = newMessage;
      setNewMessage('');

      // 2. Tentar enviar via Evolution API se configurado
      if (evoConfig.url && evoConfig.key && evoConfig.instance) {
        await EvolutionService.sendMessage(
          evoConfig.url,
          evoConfig.key,
          evoConfig.instance,
          selectedCustomer.phone,
          currentText
        );
      }
    } catch (err: any) {
      alert("Mensagem salva no banco, mas houve um erro na Evolution API: " + err.message);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const added = await SupabaseService.addCustomer(customerForm.name, customerForm.phone);
      setCustomers(prev => [...prev, added].sort((a,b) => a.name.localeCompare(b.name)));
      setShowAddModal(false);
    } catch (err) { alert("Erro ao cadastrar."); }
    finally { setLoading(false); }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      const updated = await SupabaseService.updateCustomer(selectedCustomer.id, customerForm.name, customerForm.phone);
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c).sort((a,b) => a.name.localeCompare(b.name)));
      setSelectedCustomer(updated);
      setShowEditModal(false);
    } catch (err) { alert("Erro ao atualizar."); }
    finally { setLoading(false); }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <aside className="w-16 bg-slate-900 flex flex-col items-center py-6 space-y-8 shadow-xl z-20">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">E</div>
        <nav className="flex flex-col space-y-4">
          <button onClick={() => setActiveTab('chat')} className={`p-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><MessageSquare size={20} /></button>
          <button onClick={() => setActiveTab('customers')} className={`p-3 rounded-xl transition-all ${activeTab === 'customers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><Users size={20} /></button>
          <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><Settings size={20} /></button>
        </nav>
      </aside>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-slate-800 mb-4 uppercase tracking-wider text-xs font-black text-indigo-600">
              {activeTab === 'chat' ? 'Conversas' : activeTab === 'customers' ? 'Meus Clientes' : 'Configurações'}
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar por nome ou celular..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab !== 'settings' ? (
              filteredCustomers.map(customer => (
                <div key={customer.id} className={`group flex items-center border-b border-slate-50 hover:bg-slate-50 transition-all ${selectedCustomer?.id === customer.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
                  <button onClick={() => setSelectedCustomer(customer)} className="flex-1 p-4 flex items-center space-x-4 text-left">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0"><UserIcon size={24} /></div>
                    <div className="flex-1 overflow-hidden">
                      <span className="font-semibold text-slate-800 truncate block">{customer.name}</span>
                      <p className="text-sm text-slate-500 truncate">{customer.phone}</p>
                    </div>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setCustomerForm({name: customer.name, phone: customer.phone}); setSelectedCustomer(customer); setShowEditModal(true); }} className="opacity-0 group-hover:opacity-100 p-3 mr-2 text-slate-400 hover:text-indigo-600 transition-all"><Edit2 size={16} /></button>
                </div>
              ))
            ) : (
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Globe size={16}/> Evolution API</h3>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="URL da API (ex: https://api.sua.com)" value={evoConfig.url} onChange={e => setEvoConfig({...evoConfig, url: e.target.value})} />
                    <input type="password" title="API Key" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Global API Key" value={evoConfig.key} onChange={e => setEvoConfig({...evoConfig, key: e.target.value})} />
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome da Instância" value={evoConfig.instance} onChange={e => setEvoConfig({...evoConfig, instance: e.target.value})} />
                    <button onClick={saveEvoSettings} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors">Salvar Configurações</button>
                  </div>
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
              <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><UserIcon size={20} /></div>
                  <div>
                    <h2 className="font-bold text-slate-800 leading-tight">{selectedCustomer.name}</h2>
                    <span className="text-xs text-green-500 font-medium">{selectedCustomer.phone}</span>
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${msg.from_me ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'}`}>
                      <p className="text-sm">{msg.content}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.from_me ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <footer className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <input type="text" placeholder="Digite sua mensagem..." className="flex-1 bg-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                  <button onClick={handleSendMessage} className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition-all"><Send size={20} /></button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4"><MessageSquare size={32} /></div>
              <h2 className="text-lg font-semibold text-slate-600">Chat CRM Evolution</h2>
              <p className="text-sm max-w-xs">Selecione um cliente ao lado. Não esqueça de configurar sua API na aba de ajustes.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Cadastro/Edição */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{showEditModal ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => {setShowAddModal(false); setShowEditModal(false);}} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={showEditModal ? handleUpdateCustomer : handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: João Silva" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp (55 + DDD + Número)</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 5511999999999" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
                {loading ? 'Processando...' : showEditModal ? 'Salvar Alterações' : 'Cadastrar no Supabase'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}