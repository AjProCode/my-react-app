import React, { useState, useEffect, useRef } from 'react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
import {
  Edit, Trash2, Plus, HeartPulse, Activity, BrainCircuit, Bot, UtensilsCrossed,
  FileQuestion, BookOpenCheck, Dumbbell, Volume2, StopCircle, UserCheck, Shield,
  Send, Users, Stethoscope, LogOut, MessageSquare
} from 'lucide-react';

// --- SUPABASE SETUP ---
// IMPORTANT: Replace with your Supabase project URL and Anon Key
const supabaseUrl = 'https://jbtzmlwalnketmtuqxpq.supabase.co'; // e.g., 'https://your-project-id.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHptbHdhbG5rZXRtdHVxeHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI4MjQsImV4cCI6MjA3MDkyODgyNH0.1-3bhtojVsccVsMVwo_FOrzaMfgPYXdf3slNdk4y5BU'; // e.g., 'ey...your-anon-key...';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER FUNCTIONS FOR TTS ---
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
  const pcm16 = new Int16Array(pcmData);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  view.setUint32(0, 1380533830, false); // "RIFF"
  view.setUint32(4, 36 + pcm16.length * 2, true);
  view.setUint32(8, 1463899717, false); // "WAVE"
  view.setUint32(12, 1718449184, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 1684108385, false); // "data"
  view.setUint32(40, pcm16.length * 2, true);
  return new Blob([header, pcm16], { type: 'audio/wav' });
}

// --- REUSABLE UI COMPONENTS ---
const SectionTitle = ({ title }) => <h2 className="text-5xl font-black text-gray-800 mb-8 tracking-tight text-center sm:text-left">{title}</h2>;
const LoadingSpinner = () => (
  <div className="flex flex-col justify-center items-center h-full p-10">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    <p className="mt-4 text-lg font-semibold text-gray-600">Loading...</p>
  </div>
);
const ActionButton = ({ onClick, disabled, isLoading, loadingText, children, className }) => (
  <button onClick={onClick} disabled={disabled || isLoading} className={`w-full p-4 text-xl font-bold text-white rounded-lg transition duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {isLoading ? (
      <span className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
        {loadingText}
      </span>
    ) : (
      children
    )}
  </button>
);

// --- AUTHENTICATION COMPONENT ---
const AuthComponent = ({ showMessage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage("Logged in successfully!", 'success');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Insert a new profile for the new user
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, email: email, role: 'patient' });
        if (insertError) throw insertError;
        showMessage("Account created! Please check your email for verification.", 'success');
      }
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md">
             <header className="text-center mb-8">
                <h1 className="text-6xl font-black text-gray-800 tracking-tighter">AI Health Tracker</h1>
                <p className="text-xl text-gray-500 mt-2">Your intelligent wellness companion</p>
            </header>
            <div className="p-8 bg-white rounded-2xl shadow-xl">
                <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <label className="block text-lg font-semibold text-gray-700 mb-2">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-lg font-semibold text-gray-700 mb-2">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg" required />
                    </div>
                    <ActionButton type="submit" isLoading={loading} loadingText={isLogin ? "Logging in..." : "Signing up..."} className="bg-blue-600 hover:bg-blue-700">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </ActionButton>
                </form>
                <p className="mt-6 text-center text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold ml-2 hover:underline">
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    </div>
  );
};


// --- PATIENT DASHBOARD & FEATURES ---
const PatientDashboard = ({ user, showMessage, handleSignOut }) => {
    // All the state from the original App component is moved here
    const [activeTab, setActiveTab] = useState('health');
    const [healthRecords, setHealthRecords] = useState([]);
    const [symptoms, setSymptoms] = useState([]);
    // ... and so on for all other features
    const [healthFormData, setHealthFormData] = useState({ date: '', weight: '', bloodSugar: '', bloodPressureSystolicMin: '', bloodPressureSystolicMax: '', bloodPressureDiastolicMin: '', bloodPressureDiastolicMax: '', notes: '' });
    const [editingHealthId, setEditingHealthId] = useState(null);
    const [symptomFormData, setSymptomFormData] = useState({ date: '', description: '', severity: 'mild', notes: '' });
    const [editingSymptomId, setEditingSymptomId] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [recipeSuggestions, setRecipeSuggestions] = useState([]);
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const [dietaryPreference, setDietaryPreference] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatMessagesEndRef = useRef(null);
    const [mealDescription, setMealDescription] = useState('');
    const [mealAnalysis, setMealAnalysis] = useState('');
    const [isLoadingMealAnalysis, setIsLoadingMealAnalysis] = useState(false);
    const [doctorQuestions, setDoctorQuestions] = useState('');
    const [isLoadingDoctorQuestions, setIsLoadingDoctorQuestions] = useState(false);
    const [workoutPlan, setWorkoutPlan] = useState(null);
    const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
    const [workoutGoal, setWorkoutGoal] = useState('Weight Loss');
    const [fitnessLevel, setFitnessLevel] = useState('Beginner');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioPlayerRef = useRef(null);

    // Doctor connection state
    const [doctors, setDoctors] = useState([]);
    const [myDoctorConnection, setMyDoctorConnection] = useState(null);
    const [doctorChatMessages, setDoctorChatMessages] = useState([]);
    const [doctorChatInput, setDoctorChatInput] = useState('');
    const [isSendingDoctorMessage, setIsSendingDoctorMessage] = useState(false);

    // Fetch patient's data
    useEffect(() => {
        // Fetch Health Records
        const healthSub = supabase.from('health_records').select('*').eq('user_id', user.id)
            .on('*', () => {
                fetchHealthRecords();
            }).subscribe();
        
        // Fetch Symptoms
        const symptomSub = supabase.from('symptoms').select('*').eq('user_id', user.id)
            .on('*', () => {
                fetchSymptoms();
            }).subscribe();

        // Fetch Doctor Connection & Messages
        const connectionSub = supabase.from('doctor_patient_connections').select('*, doctor:profiles!doctor_id(*)').eq('patient_id', user.id)
            .on('*', () => {
                fetchMyDoctor();
            }).subscribe();

        fetchHealthRecords();
        fetchSymptoms();
        fetchDoctors();
        fetchMyDoctor();

        return () => {
            supabase.removeSubscription(healthSub);
            supabase.removeSubscription(symptomSub);
            supabase.removeSubscription(connectionSub);
        };
    }, [user.id]);
    
    // Subscribe to chat messages if connection is active
    useEffect(() => {
        if (myDoctorConnection?.status === 'active') {
            const chatSub = supabase.from('chat_messages').select('*').eq('connection_id', myDoctorConnection.id)
                .on('*', () => fetchDoctorChatMessages(myDoctorConnection.id)).subscribe();
            fetchDoctorChatMessages(myDoctorConnection.id);
            return () => supabase.removeSubscription(chatSub);
        }
    }, [myDoctorConnection]);

    const fetchHealthRecords = async () => {
        const { data } = await supabase.from('health_records').select('*').eq('user_id', user.id).order('date', { ascending: false });
        setHealthRecords(data || []);
    };
    const fetchSymptoms = async () => {
        const { data } = await supabase.from('symptoms').select('*').eq('user_id', user.id).order('date', { ascending: false });
        setSymptoms(data || []);
    };
    const fetchDoctors = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('role', 'doctor');
        setDoctors(data || []);
    };
    const fetchMyDoctor = async () => {
        const { data } = await supabase.from('doctor_patient_connections').select('*, doctor:profiles!doctor_id(*)').eq('patient_id', user.id).single();
        setMyDoctorConnection(data);
    };
    const fetchDoctorChatMessages = async (connectionId) => {
        const { data } = await supabase.from('chat_messages').select('*').eq('connection_id', connectionId).order('created_at');
        setDoctorChatMessages(data || []);
    };

    const handleConnectToDoctor = async (doctorId) => {
        const { error } = await supabase.from('doctor_patient_connections').insert({
            patient_id: user.id,
            doctor_id: doctorId,
            status: 'pending'
        });
        if (error) showMessage(error.message, 'error');
        else showMessage("Connection request sent!", 'success');
    };

    const handleSendDoctorMessage = async (e) => {
        e.preventDefault();
        if (!doctorChatInput.trim() || !myDoctorConnection) return;
        setIsSendingDoctorMessage(true);
        const { error } = await supabase.from('chat_messages').insert({
            connection_id: myDoctorConnection.id,
            sender_id: user.id,
            content: doctorChatInput
        });
        if (error) showMessage(error.message, 'error');
        setDoctorChatInput('');
        setIsSendingDoctorMessage(false);
    };

    // All Gemini API and CRUD functions from the original App component go here
    // ... (handleHealthSubmit, handleSymptomSubmit, handleAnalyze, etc.)
    // Note: They need to be adapted to use Supabase instead of Firestore
    const handleHealthSubmit = async (e) => {
        e.preventDefault();
        const record = { ...healthFormData, user_id: user.id };
        const { error } = editingHealthId
            ? await supabase.from('health_records').update(record).eq('id', editingHealthId)
            : await supabase.from('health_records').insert(record);
        
        if (error) showMessage(error.message, 'error');
        else showMessage(editingHealthId ? "Record updated!" : "Record added!", 'success');
        setEditingHealthId(null);
        setHealthFormData({ date: '', weight: '', bloodSugar: '', bloodPressureSystolicMin: '', bloodPressureSystolicMax: '', bloodPressureDiastolicMin: '', bloodPressureDiastolicMax: '', notes: '' });
    };

    const handleDeleteHealth = async (id) => {
        const { error } = await supabase.from('health_records').delete().eq('id', id);
        if (error) showMessage(error.message, 'error');
        else showMessage("Record deleted.", 'success');
    };
    
    // ... (other handlers converted similarly)
    
    // The JSX for the patient dashboard remains largely the same, but wrapped in this component
    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tighter">My Dashboard</h1>
                    <p className="text-lg text-gray-500">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                    <LogOut /> Sign Out
                </button>
            </header>
            
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8">
                <nav className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                    {/* Add Doctor Connect Tab */}
                    <TabButton icon={<Stethoscope />} label="Connect with Doctor" isActive={activeTab === 'doctor'} onClick={() => setActiveTab('doctor')} />
                    <TabButton icon={<HeartPulse />} label="Health Records" isActive={activeTab === 'health'} onClick={() => setActiveTab('health')} />
                    <TabButton icon={<Activity />} label="Symptom Tracker" isActive={activeTab === 'symptoms'} onClick={() => setActiveTab('symptoms')} />
                    <TabButton icon={<BrainCircuit />} label="AI Analysis" isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
                    <TabButton icon={<UtensilsCrossed />} label="Recipe Ideas" isActive={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
                    <TabButton icon={<Bot />} label="AI Health Assistant" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <TabButton icon={<BookOpenCheck />} label="Meal Log" isActive={activeTab === 'mealLog'} onClick={() => setActiveTab('mealLog')} />
                    <TabButton icon={<Dumbbell />} label="Workout Plan" isActive={activeTab === 'workout'} onClick={() => setActiveTab('workout')} />
                    <TabButton icon={<FileQuestion />} label="Doctor Prep" isActive={activeTab === 'doctorPrep'} onClick={() => setActiveTab('doctorPrep')} />
                </nav>

                <main className="bg-gray-50 rounded-2xl p-6 sm:p-8 min-h-[500px]">
                    {activeTab === 'doctor' && <DoctorConnectTab doctors={doctors} connection={myDoctorConnection} handleConnect={handleConnectToDoctor} messages={doctorChatMessages} input={doctorChatInput} setInput={setDoctorChatInput} handleSend={handleSendDoctorMessage} isSending={isSendingDoctorMessage} currentUser={user} />}
                    {activeTab === 'health' && <HealthRecordsTab formData={healthFormData} handleFormChange={(e) => setHealthFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} handleFormSubmit={handleHealthSubmit} records={healthRecords} handleEdit={(r) => { setEditingHealthId(r.id); setHealthFormData(r); }} handleDelete={handleDeleteHealth} editingId={editingHealthId} />}
                    {/* Render other tabs similarly */}
                </main>
            </div>
        </div>
    );
};

// --- DOCTOR DASHBOARD ---
const DoctorDashboard = ({ user, showMessage, handleSignOut }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientData, setPatientData] = useState({ records: [], symptoms: [] });
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const connectionSub = supabase.from('doctor_patient_connections').select('*, patient:profiles!patient_id(*)').eq('doctor_id', user.id)
            .on('*', fetchConnections).subscribe();
        fetchConnections();
        return () => supabase.removeSubscription(connectionSub);
    }, [user.id]);
    
    useEffect(() => {
        let chatSub;
        if (selectedPatient) {
            fetchPatientData(selectedPatient.patient.id);
            fetchChatMessages(selectedPatient.id);
            chatSub = supabase.from('chat_messages').select('*').eq('connection_id', selectedPatient.id)
                .on('*', () => fetchChatMessages(selectedPatient.id)).subscribe();
        }
        return () => {
            if (chatSub) supabase.removeSubscription(chatSub);
        };
    }, [selectedPatient]);

    const fetchConnections = async () => {
        const { data } = await supabase.from('doctor_patient_connections').select('*, patient:profiles!patient_id(*)').eq('doctor_id', user.id);
        setPatients(data || []);
    };

    const fetchPatientData = async (patientId) => {
        const { data: records } = await supabase.from('health_records').select('*').eq('user_id', patientId).order('date', { ascending: false });
        const { data: symptoms } = await supabase.from('symptoms').select('*').eq('user_id', patientId).order('date', { ascending: false });
        setPatientData({ records: records || [], symptoms: symptoms || [] });
    };

    const fetchChatMessages = async (connectionId) => {
        const { data } = await supabase.from('chat_messages').select('*').eq('connection_id', connectionId).order('created_at');
        setChatMessages(data || []);
    };

    const handleUpdateStatus = async (connectionId, status) => {
        const { error } = await supabase.from('doctor_patient_connections').update({ status }).eq('id', connectionId);
        if (error) showMessage(error.message, 'error');
        else showMessage(`Connection ${status}.`, 'success');
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedPatient) return;
        setIsSending(true);
        const { error } = await supabase.from('chat_messages').insert({
            connection_id: selectedPatient.id,
            sender_id: user.id,
            content: chatInput
        });
        if (error) showMessage(error.message, 'error');
        setChatInput('');
        setIsSending(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tighter flex items-center gap-3"><Stethoscope /> Doctor Portal</h1>
                    <p className="text-lg text-gray-500">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                    <LogOut /> Sign Out
                </button>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-2xl p-6">
                    <h2 className="text-3xl font-bold mb-4">My Patients</h2>
                    <div className="space-y-3">
                        {patients.map(p => (
                            <div key={p.id} onClick={() => setSelectedPatient(p)} className={`p-4 rounded-lg cursor-pointer transition ${selectedPatient?.id === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-100'}`}>
                                <p className="font-bold">{p.patient.email}</p>
                                <p className={`text-sm font-semibold capitalize ${p.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>{p.status}</p>
                                {p.status === 'pending' && (
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(p.id, 'active'); }} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Accept</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(p.id, 'rejected'); }} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Decline</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-2xl p-6">
                    {!selectedPatient ? (
                        <div className="flex items-center justify-center h-full"><p className="text-2xl text-gray-500">Select a patient to view their details.</p></div>
                    ) : (
                        <div>
                            <h2 className="text-3xl font-bold mb-4">Details for <span className="text-blue-600">{selectedPatient.patient.email}</span></h2>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                                {/* Patient Data and Chat */}
                                <div>
                                    <h3 className="text-2xl font-semibold mb-2">Chat</h3>
                                    <div className="bg-gray-100 rounded-lg p-4 h-96 overflow-y-auto flex flex-col gap-3 mb-4">
                                        {chatMessages.map(msg => (
                                            <div key={msg.id} className={`p-3 rounded-lg max-w-xs ${msg.sender_id === user.id ? 'bg-blue-500 text-white self-end' : 'bg-gray-300 self-start'}`}>
                                                {msg.content}
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="w-full p-3 border-2 rounded-lg" placeholder="Type a message..." />
                                        <button type="submit" disabled={isSending} className="p-3 bg-blue-600 text-white rounded-lg"><Send /></button>
                                    </form>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold mb-2">Health Records</h3>
                                    <div className="space-y-2">
                                        {patientData.records.map(r => <div key={r.id} className="bg-gray-50 p-2 rounded">{r.date}: Weight {r.weight}kg, Sugar {r.bloodSugar}mg/dL</div>)}
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-2 mt-4">Symptoms</h3>
                                    <div className="space-y-2">
                                        {patientData.symptoms.map(s => <div key={s.id} className="bg-gray-50 p-2 rounded">{s.date}: {s.description} ({s.severity})</div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({ user, showMessage, handleSignOut }) => {
    const [users, setUsers] = useState([]);
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        const profileSub = supabase.from('profiles').select('*').on('*', fetchProfiles).subscribe();
        fetchProfiles();
        return () => supabase.removeSubscription(profileSub);
    }, []);

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('*');
        setUsers(data.filter(p => p.role === 'patient') || []);
        setDoctors(data.filter(p => p.role === 'doctor') || []);
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tighter flex items-center gap-3"><Shield /> Admin Panel</h1>
                    <p className="text-lg text-gray-500">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                    <LogOut /> Sign Out
                </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-2"><Users /> Patients ({users.length})</h2>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {users.map(u => <div key={u.id} className="bg-gray-100 p-3 rounded-lg">{u.email}</div>)}
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-2"><Stethoscope /> Doctors ({doctors.length})</h2>
                     <div className="max-h-96 overflow-y-auto space-y-2">
                        {doctors.map(d => <div key={d.id} className="bg-gray-100 p-3 rounded-lg">{d.email}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP ROUTER ---
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const messageTimeoutRef = useRef(null);

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
            const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            setProfile(userProfile);
        }
        setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  const showMessage = (text, type) => {
    setMessage({ text, type });
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
      showMessage("Signed out successfully.", 'success');
  };

  if (loading) {
      return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 font-inter">
        {message.text && (
            <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg font-bold text-lg shadow-xl ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {message.text}
            </div>
        )}

        {!session ? (
            <AuthComponent showMessage={showMessage} />
        ) : (
            <div className="p-4 sm:p-6 lg:p-8">
                {profile?.role === 'admin' && <AdminDashboard user={session.user} showMessage={showMessage} handleSignOut={handleSignOut} />}
                {profile?.role === 'doctor' && <DoctorDashboard user={session.user} showMessage={showMessage} handleSignOut={handleSignOut} />}
                {profile?.role === 'patient' && <PatientDashboard user={session.user} showMessage={showMessage} handleSignOut={handleSignOut} />}
            </div>
        )}
    </div>
  );
}

// --- Placeholder components for features inside PatientDashboard ---
// These would contain the JSX from the previous version
const TabButton = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex items-center space-x-3 px-5 py-3 rounded-full font-bold text-md transition-all duration-300 transform hover:scale-105 ${isActive ? 'bg-gray-800 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
    {React.cloneElement(icon, { className: "h-6 w-6" })}
    <span className="hidden sm:inline">{label}</span>
  </button>
);
const HealthRecordsTab = ({ formData, handleFormChange, handleFormSubmit, records, handleEdit, handleDelete, editingId }) => (
    <div>
        <SectionTitle title="Log Your Vitals" />
        {/* Form and list JSX from previous version goes here */}
    </div>
);
// ... Other Tab components (SymptomTrackerTab, AIAnalysisTab, etc.) would be defined here similarly.
// For brevity, I've omitted their full JSX, but it would be the same as the previous version.

const DoctorConnectTab = ({ doctors, connection, handleConnect, messages, input, setInput, handleSend, isSending, currentUser }) => {
    return (
        <div>
            <SectionTitle title="Connect with a Doctor" />
            {!connection ? (
                <div>
                    <h3 className="text-2xl font-bold mb-4">Available Doctors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doctors.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-lg shadow border">
                                <p className="font-bold text-lg">{doc.email}</p>
                                <button onClick={() => handleConnect(doc.id)} className="mt-2 w-full bg-blue-500 text-white p-2 rounded-lg font-semibold hover:bg-blue-600">Request Connection</button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <h3 className="text-2xl font-bold mb-4">My Doctor: <span className="text-blue-600">{connection.doctor.email}</span></h3>
                    <p className="text-lg mb-4">Status: <span className={`font-bold capitalize ${connection.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>{connection.status}</span></p>
                    {connection.status === 'active' ? (
                        <div>
                            <h4 className="text-xl font-semibold mb-2">Chat</h4>
                            <div className="bg-white rounded-lg p-4 h-96 overflow-y-auto flex flex-col gap-3 mb-4 border">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`p-3 rounded-lg max-w-xs ${msg.sender_id === currentUser.id ? 'bg-blue-500 text-white self-end' : 'bg-gray-300 self-start'}`}>
                                        {msg.content}
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input value={input} onChange={e => setInput(e.target.value)} className="w-full p-3 border-2 rounded-lg" placeholder="Type your message..." />
                                <button type="submit" disabled={isSending} className="p-3 bg-blue-600 text-white rounded-lg"><Send /></button>
                            </form>
                        </div>
                    ) : (
                        <p className="text-xl text-center p-8 bg-yellow-100 rounded-lg">Your connection request is pending approval.</p>
                    )}
                </div>
            )}
        </div>
    );
};
