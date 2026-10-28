import React, { useState, useEffect } from 'react';
import { 
  Car, Bike, Zap, Shield, User as UserIcon, LogOut, Plus, Search, 
  CheckCircle, AlertTriangle, Clock, DollarSign, LayoutGrid, 
  Settings, Users, History, ArrowRight, X, RefreshCw, Lock, Sparkles, MapPin, Phone, Award, Star,
  TrendingUp, BarChart3, FileSpreadsheet, PieChart, Wallet, QrCode, CreditCard, ArrowDownRight, ArrowUpRight,
  Palette, Image as ImageIcon, MessageCircle, Headphones, Send, HelpCircle, MessageSquare, ShieldAlert, Bell, Mail, Menu
} from 'lucide-react';
import { 
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, getDocs 
} from 'firebase/firestore';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type UserRole = 'admin' | 'staff' | 'customer';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  loyaltyPoints?: number;
  membershipTier?: 'regular' | 'vip';
  walletBalance?: number;
  phoneNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  createdAt?: string;
  bgTheme?: string;
  bgCustomUrl?: string;
}

type SlotType = 'car_standard' | 'car_vip' | 'motorbike' | 'electric';
type SlotStatus = 'available' | 'occupied';

interface ParkingSlot {
  id: string;
  slotNumber: string;
  zoneId: string;
  zoneName: string;
  type: SlotType;
  status: SlotStatus;
  currentTicketId?: string;
}

interface ParkingTicket {
  id: string;
  slotId: string;
  slotNumber: string;
  licensePlate: string;
  vehicleType: 'car' | 'suv' | 'sedan' | 'motorbike' | 'electric';
  isVip: boolean;
  customerName: string;
  phoneNumber: string;
  userId?: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'PENDING' | 'ACTIVE';
  fee?: number;
  paymentMethod?: 'cash' | 'transfer' | 'wallet';
  paymentStatus?: 'unpaid' | 'pending_approval' | 'paid' | 'rejected';
  pointsEarned?: number;
  staffId?: string;
  requestedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'topup' | 'payment' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface ParkingSubscription {
  id: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  licensePlate: string;
  passType: 'monthly_bike' | 'monthly_car' | 'monthly_electric';
  vehicleType: 'motorbike' | 'car' | 'electric';
  price: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired';
  paymentMethod: 'wallet' | 'transfer' | 'cash';
  createdAt: string;
}

interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
  isAdminReply?: boolean;
}

interface SupportComplaint {
  id: string;
  userId: string;
  userName: string;
  title: string;
  category: string;
  description: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  adminResponse?: string;
}

interface ServiceReview {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'review' | 'system' | 'staff_alert';
  isRead: boolean;
  createdAt: string;
  ticketId?: string;
}

const BG_THEMES = [
  {
    id: 'cyber-dark',
    name: 'Bãi Đỗ Xe Cyber Midnight',
    sub: 'Bãi đỗ xe ngầm hiện đại Đêm Cyber huyền ảo',
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'neon-city',
    name: 'Thành Phố Đêm & Bãi Đỗ Tầng',
    sub: 'Tòa nhà đỗ xe cao tầng đô thị rực rỡ ánh đèn neon tím',
    imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  {
    id: 'aurora-emerald',
    name: 'Bãi Đỗ Xe Thông Minh Đô Thị',
    sub: 'Kiến trúc bãi đỗ xe hiện đại phong cách ngọc lục bảo',
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
  },
  {
    id: 'sunset-drive',
    name: 'Bãi Đỗ Xe Hoàng Hôn Sunset',
    sub: 'Bãi đỗ xe sân thượng ngoài trời đón hoàng hôn rực rỡ',
    imageUrl: '/assets/aistudio/sunset_parking.jpg',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'tech-matrix',
    name: 'Trạm Sạc & Bãi Xe Điện EV',
    sub: 'Bãi đỗ xe điện công nghệ cao tích hợp trụ sạc EV',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'vip-luxury',
    name: 'Bãi Đỗ Xe Hoàng Gia VIP',
    sub: 'Khu đỗ xe ô tô hạng sang phủ ánh sáng vàng VIP 5 sao',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'custom',
    name: 'Ảnh Nền Tùy Chọn (Custom URL)',
    sub: 'Tự nhập đường dẫn URL hình ảnh phông nền theo sở thích riêng',
    imageUrl: '',
    badge: 'bg-slate-800 text-slate-300 border-slate-700'
  }
];

const INITIAL_SLOTS: Omit<ParkingSlot, 'id'>[] = [
  // Zone A: Standard Cars (A01 - A08)
  { slotNumber: 'A01', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A02', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A03', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A04', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A05', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A06', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A07', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A08', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  
  // Zone B: VIP Cars (B01 - B04)
  { slotNumber: 'B01', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },
  { slotNumber: 'B02', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },
  { slotNumber: 'B03', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },
  { slotNumber: 'B04', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },

  // Zone C: Motorbikes (C01 - C10)
  { slotNumber: 'C01', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C02', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C03', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C04', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C05', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C06', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C07', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C08', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },

  // Zone D: Electric Vehicles (D01 - D06)
  { slotNumber: 'D01', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
  { slotNumber: 'D02', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
  { slotNumber: 'D03', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
  { slotNumber: 'D04', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [parkingSubscriptions, setParkingSubscriptions] = useState<ParkingSubscription[]>([]);
  const [showBuyPassModal, setShowBuyPassModal] = useState<boolean>(false);
  const [buyPassType, setBuyPassType] = useState<'monthly_bike' | 'monthly_car' | 'monthly_electric'>('monthly_bike');
  const [buyPassPlate, setBuyPassPlate] = useState<string>('');
  const [buyPassPaymentMethod, setBuyPassPaymentMethod] = useState<'wallet' | 'transfer' | 'cash'>('wallet');
  const [activeTab, setActiveTab] = useState<'map' | 'tickets' | 'staff' | 'settings' | 'users' | 'analytics' | 'pending_approvals' | 'audit_logs' | 'support' | 'staff_scanner' | 'my_qr' | 'admin_tickets' | 'wallet_history' | 'pricing_config' | 'monthly_passes'>('map');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reportPeriod, setReportPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [authError, setAuthError] = useState<string>('');

  const [selectedTicketForAdminQR, setSelectedTicketForAdminQR] = useState<ParkingTicket | null>(null);
  const [showAdminQrModal, setShowAdminQrModal] = useState<boolean>(false);

  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportComplaints, setSupportComplaints] = useState<SupportComplaint[]>([]);
  const [supportReviews, setSupportReviews] = useState<ServiceReview[]>([]);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [supportSubTab, setSupportSubTab] = useState<'chat' | 'complaints' | 'reviews'>('chat');
  const [selectedChatUserId, setSelectedChatUserId] = useState<string>('');
  const [chatInputText, setChatInputText] = useState<string>('');
  const [complaintTitle, setComplaintTitle] = useState<string>('');
  const [complaintCategory, setComplaintCategory] = useState<string>('Phí gửi xe');
  const [complaintDesc, setComplaintDesc] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedTicketForReview, setSelectedTicketForReview] = useState<ParkingTicket | null>(null);
  const [ticketFilterDate, setTicketFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [ticketFilterStatus, setTicketFilterStatus] = useState<'all' | 'active' | 'pending_approval' | 'completed'>('all');
  const [ticketFilterZone, setTicketFilterZone] = useState<string>('all');
  const [ticketSearchQuery, setTicketSearchQuery] = useState<string>('');

  const [tariffSettings, setTariffSettings] = useState({
    motorbikeRate: 10000,
    carStandardRate: 30000,
    carVipRate: 50000,
    electricRate: 20000,
    peakHourSurchargePercent: 20,
    nightHourSurchargePercent: 30,
    monthlyBikePass: 150000,
    monthlyCarPass: 1200000,
  });

  const syncLatestUserData = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const freshUser = userSnap.data() as UserProfile;
        setCurrentUser(freshUser);
        localStorage.setItem('smart_parking_user', JSON.stringify(freshUser));
      }
    } catch (e) {
      console.error("Error syncing user data:", e);
    }
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'parking_tariff'), tariffSettings);
      await logAudit('Sửa Giá Tiền Cước', `${currentUser?.name} (${currentUser?.role}) đã cập nhật biểu phí cước (Xe máy: ${tariffSettings.motorbikeRate}đ, Ô tô chuẩn: ${tariffSettings.carStandardRate}đ, Ô tô VIP: ${tariffSettings.carVipRate}đ, Xe điện: ${tariffSettings.electricRate}đ, Phụ phí cao điểm: ${tariffSettings.peakHourSurchargePercent}%, Phụ phí ban đêm: ${tariffSettings.nightHourSurchargePercent}%).`);
      showToast('success', 'Đã lưu cấu hình giá cước và biểu phí thành công!');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi lưu cấu hình giá cước.');
    }
  };

  const handleBuyMonthlyPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!buyPassPlate.trim()) {
      showToast('error', 'Vui lòng nhập biển số xe đăng ký vé tháng.');
      return;
    }

    const price = buyPassType === 'monthly_bike' ? tariffSettings.monthlyBikePass : tariffSettings.monthlyCarPass;
    const vehicleType = buyPassType === 'monthly_bike' ? 'motorbike' : 'car';

    if (buyPassPaymentMethod === 'wallet') {
      const currentWallet = currentUser.walletBalance ?? 200000;
      if (currentWallet < price) {
        showToast('error', `Số dư ví không đủ! Cần ${price.toLocaleString('vi-VN')}đ (Ví hiện có: ${currentWallet.toLocaleString('vi-VN')}đ).`);
        return;
      }
      try {
        const newBal = currentWallet - price;
        const updatedUser = { ...currentUser, walletBalance: newBal };
        setCurrentUser(updatedUser);
        localStorage.setItem('smart_parking_user', JSON.stringify(updatedUser));
        await setDoc(doc(db, 'users', currentUser.uid), { walletBalance: newBal }, { merge: true });

        const txId = `tx_${Date.now()}`;
        await setDoc(doc(db, 'wallet_transactions', txId), {
          id: txId,
          userId: currentUser.uid,
          userName: currentUser.name,
          type: 'payment',
          amount: price,
          description: `Thanh toán mua Gói Vé Tháng (${buyPassType === 'monthly_bike' ? 'Xe máy' : 'Ô tô'}) - Biển số: ${buyPassPlate.toUpperCase()}`,
          createdAt: new Date().toISOString(),
          status: 'approved'
        });
        await syncLatestUserData();
      } catch (err) {
        console.error(err);
        showToast('error', 'Lỗi khi thanh toán từ ví.');
        return;
      }
    }

    try {
      const subId = `sub_${Date.now()}`;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30);

      const newSub: ParkingSubscription = {
        id: subId,
        userId: currentUser.uid,
        userName: currentUser.name,
        phoneNumber: currentUser.phoneNumber || '',
        licensePlate: buyPassPlate.trim().toUpperCase(),
        passType: buyPassType,
        vehicleType,
        price,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
        paymentMethod: buyPassPaymentMethod,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'parking_subscriptions', subId), newSub);
      await logAudit('Mua Vé Tháng', `${currentUser.name} đã đăng ký thành công gói ${buyPassType} cho biển số ${buyPassPlate.toUpperCase()} giá ${price.toLocaleString('vi-VN')}đ.`);
      await sendNotification(currentUser.uid, 'Đăng ký Vé tháng thành công', `Gói vé tháng ${buyPassType === 'monthly_bike' ? 'Xe máy' : 'Ô tô'} cho biển số ${buyPassPlate.toUpperCase()} đã được kích hoạt đến ${endDate.toLocaleDateString('vi-VN')}.`, 'system');

      showToast('success', 'Đăng ký vé tháng thành công!');
      setShowBuyPassModal(false);
      setBuyPassPlate('');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi đăng ký vé tháng.');
    }
  };

  const handleRenewPass = async (sub: ParkingSubscription) => {
    if (!currentUser) return;
    const price = sub.price;
    const currentWallet = currentUser.walletBalance ?? 200000;

    if (currentWallet < price) {
      showToast('error', `Số dư ví không đủ để gia hạn! Cần ${price.toLocaleString('vi-VN')}đ.`);
      return;
    }

    try {
      const newBal = currentWallet - price;
      const updatedUser = { ...currentUser, walletBalance: newBal };
      setCurrentUser(updatedUser);
      localStorage.setItem('smart_parking_user', JSON.stringify(updatedUser));
      await setDoc(doc(db, 'users', currentUser.uid), { walletBalance: newBal }, { merge: true });

      const txId = `tx_${Date.now()}`;
      await setDoc(doc(db, 'wallet_transactions', txId), {
        id: txId,
        userId: currentUser.uid,
        userName: currentUser.name,
        type: 'payment',
        amount: price,
        description: `Gia hạn Gói Vé Tháng thêm 30 ngày - Biển số: ${sub.licensePlate}`,
        createdAt: new Date().toISOString(),
        status: 'approved'
      });

      const currentEndDate = new Date(sub.endDate > new Date().toISOString() ? sub.endDate : new Date());
      currentEndDate.setDate(currentEndDate.getDate() + 30);

      await updateDoc(doc(db, 'parking_subscriptions', sub.id), {
        endDate: currentEndDate.toISOString(),
        status: 'active'
      });

      await syncLatestUserData();

      await logAudit('Gia hạn Vé Tháng', `${currentUser.name} đã gia hạn gói vé tháng biển số ${sub.licensePlate} thêm 30 ngày (Đến ${currentEndDate.toLocaleDateString('vi-VN')}).`);
      await sendNotification(currentUser.uid, 'Gia hạn Vé tháng thành công', `Gói vé tháng cho xe ${sub.licensePlate} đã được gia hạn thành công đến ngày ${currentEndDate.toLocaleDateString('vi-VN')}.`, 'system');

      showToast('success', `Đã gia hạn thành công thêm 30 ngày cho xe ${sub.licensePlate}!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi gia hạn vé tháng.');
    }
  };

  // Modals for Check-In / Parking
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [selectedSlotForCheckIn, setSelectedSlotForCheckIn] = useState<ParkingSlot | null>(null);
  const [checkInPlate, setCheckInPlate] = useState<string>('');
  const [checkInVehicleType, setCheckInVehicleType] = useState<'car' | 'suv' | 'sedan' | 'motorbike' | 'electric'>('car');
  const [checkInIsVip, setCheckInIsVip] = useState<boolean>(false);
  const [checkInCustomerName, setCheckInCustomerName] = useState<string>('');
  const [checkInPhone, setCheckInPhone] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const [showCheckOutModal, setShowCheckOutModal] = useState<boolean>(false);
  const [selectedTicketForCheckOut, setSelectedTicketForCheckOut] = useState<ParkingTicket | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'transfer' | 'wallet'>('wallet');

  // Wallet and Top-Up States
  const [showTopUpModal, setShowTopUpModal] = useState<boolean>(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(100000);
  const [customTopUpInput, setCustomTopUpInput] = useState<string>('');
  const [topUpTargetUser, setTopUpTargetUser] = useState<UserProfile | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [showWalletHistoryModal, setShowWalletHistoryModal] = useState<boolean>(false);

  const [showQuickCheckOutListModal, setShowQuickCheckOutListModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editBirthDate, setEditBirthDate] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('Nam');
  const [editCurrentPassword, setEditCurrentPassword] = useState<string>('');
  const [editNewPassword, setEditNewPassword] = useState<string>('');
  const [editConfirmNewPassword, setEditConfirmNewPassword] = useState<string>('');

  const [showSetPasswordModal, setShowSetPasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');

  // Background Theme States
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [selectedBgTheme, setSelectedBgTheme] = useState<string>('cyber-dark');
  const [customBgUrlInput, setCustomBgUrlInput] = useState<string>('');

  const handleSaveBgTheme = async (themeId: string, customUrl: string = customBgUrlInput) => {
    if (!currentUser) return;
    try {
      const updated: UserProfile = {
        ...currentUser,
        bgTheme: themeId,
        bgCustomUrl: customUrl
      };
      setCurrentUser(updated);
      localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      await setDoc(doc(db, 'users', currentUser.uid), { bgTheme: themeId, bgCustomUrl: customUrl }, { merge: true });
      setShowThemeModal(false);
      showToast('success', 'Đã lưu phông nền giao diện tài khoản thành công!');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi lưu phông nền.');
    }
  };

  const [showEditSlotModal, setShowEditSlotModal] = useState<boolean>(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<ParkingSlot | null>(null);
  const [editSlotNumber, setEditSlotNumber] = useState<string>('');
  const [editSlotType, setEditSlotType] = useState<SlotType>('car_standard');

  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [showManageUsersModal, setShowManageUsersModal] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [uName, setUName] = useState<string>('');
  const [uEmail, setUEmail] = useState<string>('');
  const [uRole, setURole] = useState<UserRole>('customer');
  const [uTier, setUTier] = useState<'regular' | 'vip'>('regular');
  const [uPoints, setUPoints] = useState<number>(0);
  const [uPhone, setUPhone] = useState<string>('');
  const [uAddress, setUAddress] = useState<string>('');
  const [uGender, setUGender] = useState<string>('Nam');

  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [addName, setAddName] = useState<string>('');
  const [addEmail, setAddEmail] = useState<string>('');
  const [addPassword, setAddPassword] = useState<string>('');
  const [addRole, setAddRole] = useState<UserRole>('customer');
  const [addTier, setAddTier] = useState<'regular' | 'vip'>('regular');
  const [addPoints, setAddPoints] = useState<number>(0);
  const [addPhone, setAddPhone] = useState<string>('');
  const [addAddress, setAddAddress] = useState<string>('');

  const [authTab, setAuthTab] = useState<'quick' | 'register'>('quick');
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regAddress, setRegAddress] = useState<string>('');

  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [scannerInputCode, setScannerInputCode] = useState<string>('');
  const [scannedTicketResult, setScannedTicketResult] = useState<ParkingTicket | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (activeTab === 'staff_scanner' && showCameraScanner) {
      try {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        scanner.render(
          async (decodedText) => {
            setScannerInputCode(decodedText);
            const found = tickets.find(t => t.id === decodedText.trim());
            if (found) {
              setScannedTicketResult(found);
              if (found.status === 'pending') {
                // Rule A: Camera QR scan automatically approves ticket immediately
                await handleApproveCheckIn(found);
                setScannedTicketResult({ ...found, status: 'active' });
                showToast('success', `Quét camera thành công! Đã tự động duyệt xe ${found.licensePlate} vào ô ${found.slotNumber}.`);
              } else if (found.status === 'active') {
                if (found.paymentStatus === 'paid') {
                  showToast('success', `Quét camera xe ${found.licensePlate}! Vé ĐÃ THANH TOÁN - Có thể xác nhận cho xe ra.`);
                } else {
                  showToast('error', `⚠️ CẢNH BÁO: Khách hàng chưa thanh toán phí gửi xe (${found.licensePlate})! Không được phép xuất xe.`);
                }
              } else {
                showToast('success', `Tìm thấy vé xe ${found.licensePlate} (${found.status.toUpperCase()}).`);
              }
            } else {
              showToast('error', `Mã QR không tồn tại hoặc không hợp lệ: ${decodedText}`);
            }
            if (scanner) {
              scanner.clear().catch(() => {});
            }
            setShowCameraScanner(false);
          },
          (errorMessage) => {}
        );
      } catch (e) {
        console.warn("Camera scanner init error:", e);
      }
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [activeTab, showCameraScanner, tickets]);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  const sendNotification = async (targetUserId: string, title: string, message: string, type: AppNotification['type'], ticketId?: string) => {
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newNotif: any = {
        id: notifId,
        userId: targetUserId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      if (ticketId) {
        newNotif.ticketId = ticketId;
      }
      await setDoc(doc(db, 'notifications', notifId), newNotif);
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!regName || !regEmail || !regPassword || !regPhone || !regAddress) {
      setAuthError('Vui lòng nhập đầy đủ thông tin bắt buộc (Họ tên, Email, Mật khẩu, Số điện thoại, Địa chỉ).');
      return;
    }
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      let exists = false;
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile & { password?: string };
        if (u.email && u.email.toLowerCase() === regEmail.toLowerCase()) {
          exists = true;
        }
      });

      if (exists) {
        setAuthError('Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
        return;
      }

      const uid = `user_${Date.now()}`;
      const newProfile = {
        uid,
        email: regEmail,
        password: regPassword,
        name: regName,
        role: 'customer' as UserRole,
        membershipTier: 'regular' as const,
        loyaltyPoints: 0,
        phoneNumber: regPhone,
        address: regAddress,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', uid), newProfile);
      setCurrentUser(newProfile);
      localStorage.setItem('smart_parking_user', JSON.stringify(newProfile));
      showToast('success', 'Đăng ký tài khoản và đăng nhập thành công!');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Lỗi khi đăng ký tài khoản.');
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as UserProfile);
          } else {
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: 'Nguyễn Văn An',
              role: firebaseUser.email === 'phuocyahoo1309@gmail.com' ? 'admin' : 'customer',
              loyaltyPoints: 0,
              membershipTier: 'regular',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, defaultProfile);
            setCurrentUser(defaultProfile);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        const savedUser = localStorage.getItem('smart_parking_user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    return errInfo;
  };

  useEffect(() => {
    // Attach snapshot listeners unconditionally for real-time parking data
    const slotsQuery = query(collection(db, 'slots'));
    const unsubSlots = onSnapshot(slotsQuery, (snapshot) => {
      const loadedSlots: ParkingSlot[] = [];
      snapshot.forEach((docSnap) => {
        loadedSlots.push({ id: docSnap.id, ...docSnap.data() } as ParkingSlot);
      });

      if (loadedSlots.length === 0) {
        const seedSlots: ParkingSlot[] = INITIAL_SLOTS.map((s, idx) => ({
          ...s,
          id: `slot_${idx + 1}`
        }));
        setSlots(seedSlots);
        seedSlots.forEach(async (slotData) => {
          try {
            await setDoc(doc(db, 'slots', slotData.id), slotData);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `slots/${slotData.id}`);
          }
        });
      } else {
        setSlots(loadedSlots);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'slots');
      const fallbackSlots: ParkingSlot[] = INITIAL_SLOTS.map((s, idx) => ({
        ...s,
        id: `slot_${idx + 1}`
      }));
      setSlots(fallbackSlots);
    });

    const ticketsQuery = query(collection(db, 'tickets'));
    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const loadedTickets: ParkingTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ParkingTicket;
        let status = data.status ? String(data.status).toLowerCase() : 'pending';
        if (data.checkOutTime) {
          status = 'completed';
        }
        loadedTickets.push({ ...data, id: docSnap.id, status: status as any });
      });
      // Sort in-memory to prevent Firestore index permission errors
      loadedTickets.sort((a, b) => new Date(b.checkInTime || 0).getTime() - new Date(a.checkInTime || 0).getTime());
      setTickets(loadedTickets);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tickets');
    });

    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        const uid = docSnap.id || data.uid;
        const rawEmail = (data.email || '').trim();
        const rawName = (data.name || '').trim();

        const cleanUser: UserProfile = {
          uid,
          email: rawEmail || (uid === 'admin_default' ? 'admin@parking.vn' : uid === 'staff_default' ? 'staff@parking.vn' : 'user@parking.vn'),
          name: rawName || (uid === 'admin_default' || rawEmail === 'admin@parking.vn' ? 'Quản trị viên (Admin)' : uid === 'staff_default' || rawEmail === 'staff@parking.vn' ? 'Nhân viên bãi đỗ' : rawEmail ? rawEmail.split('@')[0] : 'Khách hàng'),
          role: data.role || (uid === 'admin_default' || rawEmail === 'admin@parking.vn' ? 'admin' : uid === 'staff_default' || rawEmail === 'staff@parking.vn' ? 'staff' : 'customer'),
          membershipTier: data.membershipTier || 'regular',
          loyaltyPoints: typeof data.loyaltyPoints === 'number' ? data.loyaltyPoints : 0,
          walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 200000,
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          gender: data.gender || 'Nam',
          birthDate: data.birthDate || '',
          createdAt: data.createdAt || new Date().toISOString()
        };

        loadedUsers.push(cleanUser);
      });

      const uniqueUsers: UserProfile[] = [];
      const seen = new Set<string>();
      for (const u of loadedUsers) {
        const key = u.email.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueUsers.push(u);
        }
      }

      setUsersList(uniqueUsers);

      if (currentUser) {
        const me = uniqueUsers.find(u => u.uid === currentUser.uid || u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (me) {
          setCurrentUser(prev => prev ? {
            ...prev,
            name: me.name || prev.name,
            walletBalance: me.walletBalance ?? prev.walletBalance ?? 200000,
            loyaltyPoints: me.loyaltyPoints ?? prev.loyaltyPoints ?? 0,
            membershipTier: me.membershipTier || prev.membershipTier
          } : me);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    const transQuery = query(collection(db, 'wallet_transactions'));
    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      const loadedTrans: WalletTransaction[] = [];
      snapshot.forEach((docSnap) => {
        loadedTrans.push({ id: docSnap.id, ...docSnap.data() } as WalletTransaction);
      });
      loadedTrans.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setWalletTransactions(loadedTrans);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'wallet_transactions');
    });

    const auditQuery = query(collection(db, 'audit_logs'));
    const unsubAudit = onSnapshot(auditQuery, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      logs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setAuditLogs(logs);
    }, (err) => {
      console.warn("Audit logs warning:", err);
    });

    const msgQuery = query(collection(db, 'support_messages'));
    const unsubMsg = onSnapshot(msgQuery, (snapshot) => {
      const loaded: SupportMessage[] = [];
      snapshot.forEach(docSnap => loaded.push({ id: docSnap.id, ...docSnap.data() } as SupportMessage));
      loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setSupportMessages(loaded);
    }, (err) => console.warn(err));

    const compQuery = query(collection(db, 'support_complaints'));
    const unsubComp = onSnapshot(compQuery, (snapshot) => {
      const loaded: SupportComplaint[] = [];
      snapshot.forEach(docSnap => loaded.push({ id: docSnap.id, ...docSnap.data() } as SupportComplaint));
      loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setSupportComplaints(loaded);
    }, (err) => console.warn(err));

    const revQuery = query(collection(db, 'support_reviews'));
    const unsubRev = onSnapshot(revQuery, (snapshot) => {
      const loaded: ServiceReview[] = [];
      snapshot.forEach(docSnap => loaded.push({ id: docSnap.id, ...docSnap.data() } as ServiceReview));
      loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setSupportReviews(loaded);
    }, (err) => console.warn(err));

    const notifsQuery = query(collection(db, 'notifications'));
    const unsubNotifs = onSnapshot(notifsQuery, (snapshot) => {
      const loaded: AppNotification[] = [];
      snapshot.forEach(docSnap => loaded.push({ id: docSnap.id, ...docSnap.data() } as AppNotification));
      loaded.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(loaded);
    }, (err) => console.warn(err));

    const subsQuery = query(collection(db, 'parking_subscriptions'));
    const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
      const loaded: ParkingSubscription[] = [];
      snapshot.forEach(docSnap => loaded.push({ id: docSnap.id, ...docSnap.data() } as ParkingSubscription));
      loaded.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setParkingSubscriptions(loaded);
    }, (err) => console.warn(err));

    const loadTariff = async () => {
      try {
        const tariffSnap = await getDoc(doc(db, 'settings', 'parking_tariff'));
        if (tariffSnap.exists()) {
          setTariffSettings(tariffSnap.data() as any);
        }
      } catch (e) {
        console.warn("Load tariff warn:", e);
      }
    };
    loadTariff();

    return () => {
      unsubSlots();
      unsubTickets();
      unsubUsers();
      unsubTrans();
      unsubAudit();
      unsubMsg();
      unsubComp();
      unsubRev();
      unsubNotifs();
      unsubSubs();
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.role === 'staff' && activeTab === 'map') {
      setActiveTab('staff_scanner');
    }
  }, [currentUser?.role, activeTab]);

  useEffect(() => {
    if (activeTab === 'staff_scanner' && currentUser?.role === 'customer') {
      setActiveTab('my_qr');
    }
  }, [activeTab, currentUser?.role]);

  // Auto-Cancel timeout for pending tickets after 10 minutes (600,000ms)
  useEffect(() => {
    const timerInterval = setInterval(async () => {
      const now = Date.now();
      for (const t of tickets) {
        if (t.status === 'pending' && t.createdAt) {
          const createdAtMs = new Date(t.createdAt).getTime();
          if (now - createdAtMs > 10 * 60 * 1000) {
            try {
              await updateDoc(doc(db, 'tickets', t.id), { status: 'cancelled' });
              await updateDoc(doc(db, 'slots', t.slotId), { status: 'available', currentTicketId: null });
              await sendNotification(t.userId || t.customerName, '⏰ Giữ chỗ đã tự động hủy', `Vé giữ chỗ ô ${t.slotNumber} (Biển số: ${t.licensePlate}) đã tự động hủy do quá hạn 10 phút không quét QR xác nhận.`, 'system', t.id);
            } catch (err) {
              console.warn('Auto cancel error:', err);
            }
          }
        }
      }
    }, 5000);
    return () => clearInterval(timerInterval);
  }, [tickets]);

  const logAudit = async (action: string, details: string) => {
    if (!currentUser) return;
    try {
      const logId = `log_${Date.now()}`;
      const newLog = {
        id: logId,
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action,
        details,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'audit_logs', logId), newLog);
    } catch (e) {
      console.warn("Error logging audit:", e);
    }
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setUName(user.name);
    setUEmail(user.email);
    setURole(user.role);
    setUTier(user.membershipTier || 'regular');
    setUPoints(user.loyaltyPoints || 0);
    setUPhone(user.phoneNumber || '');
    setUAddress(user.address || '');
    setUGender(user.gender || 'Nam');
    setShowManageUsersModal(true);
  };

  const handleSaveManagedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    try {
      const changes: string[] = [];
      if (uName !== selectedUserForEdit.name) changes.push('Sửa tên');
      if (uRole !== selectedUserForEdit.role) changes.push('Sửa vai trò');
      if (uTier !== (selectedUserForEdit.membershipTier || 'regular')) changes.push('Sửa hạng thành viên');
      if (Number(uPoints) !== (selectedUserForEdit.loyaltyPoints || 0)) changes.push('Sửa điểm thưởng');
      if (uPhone !== (selectedUserForEdit.phoneNumber || '')) changes.push('Sửa số điện thoại');
      if (uAddress !== (selectedUserForEdit.address || '')) changes.push('Sửa địa chỉ');
      if (uGender !== (selectedUserForEdit.gender || 'Nam')) changes.push('Sửa giới tính');

      const detailsStr = changes.length > 0
        ? `${currentUser?.name || 'Admin'} đã cập nhật tài khoản ${selectedUserForEdit.name} (${selectedUserForEdit.email}): ${changes.join(', ')}`
        : `${currentUser?.name || 'Admin'} đã cập nhật tài khoản ${selectedUserForEdit.name} (${selectedUserForEdit.email})`;

      const userRef = doc(db, 'users', selectedUserForEdit.uid);
      const isAdminUser = selectedUserForEdit.email.toLowerCase() === 'admin@parking.vn';
      const updatedData = {
        name: uName,
        role: isAdminUser ? 'admin' : uRole,
        membershipTier: uTier,
        loyaltyPoints: Number(uPoints) || 0,
        phoneNumber: uPhone,
        address: uAddress,
        gender: uGender,
      };
      await updateDoc(userRef, updatedData);
      await logAudit('Quản Lý Hồ Sơ Tài Khoản', detailsStr);
      showToast('success', `Đã cập nhật hồ sơ người dùng ${uName} thành công!`);
      if (currentUser?.uid === selectedUserForEdit.uid) {
        setCurrentUser({ ...currentUser, ...updatedData });
      }
      setShowManageUsersModal(false);
      setSelectedUserForEdit(null);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi cập nhật hồ sơ người dùng.');
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addEmail || !addPassword) {
      showToast('error', 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      let exists = false;
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.email && u.email.toLowerCase() === addEmail.toLowerCase()) {
          exists = true;
        }
      });

      if (exists) {
        showToast('error', 'Email này đã tồn tại trên hệ thống!');
        return;
      }

      const newUid = `user_${Date.now()}`;
      const newProfile = {
        uid: newUid,
        name: addName,
        email: addEmail,
        password: addPassword,
        role: addRole,
        membershipTier: addRole === 'customer' ? addTier : 'regular',
        loyaltyPoints: addRole === 'customer' ? Number(addPoints) || 0 : 0,
        phoneNumber: addPhone,
        address: addAddress,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', newUid), newProfile);
      showToast('success', `Đã thêm tài khoản ${addName} (${addRole.toUpperCase()}) thành công!`);
      setShowAddUserModal(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddRole('customer');
      setAddTier('regular');
      setAddPoints(0);
      setAddPhone('');
      setAddAddress('');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi thêm tài khoản mới.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !userToDelete.uid) {
      showToast('error', 'Lỗi: Không tìm thấy ID tài khoản.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      showToast('success', `Đã xóa tài khoản ${userToDelete.name} thành công!`);
      setUserToDelete(null);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi khi xóa tài khoản: ' + (err.message || 'Lỗi hệ thống.'));
    }
  };

  const handleResetSlots = async () => {
    try {
      for (const [idx, slotData] of INITIAL_SLOTS.entries()) {
        const slotId = `slot_${idx + 1}`;
        await setDoc(doc(db, 'slots', slotId), { ...slotData, id: slotId, status: 'available', currentTicketId: null });
      }
      showToast('success', 'Đã đặt lại tất cả ô đỗ về trạng thái TRỐNG thành công!');
    } catch (err) {
      showToast('error', 'Lỗi khi reset ô đỗ.');
    }
  };

  const handleResetInactiveSlots = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn reset tất cả các ô đang không có xe hoạt động (ô trống hoặc chờ) về trạng thái TRỐNG?')) return;
    try {
      let count = 0;
      for (const slot of slots) {
        const activeTicket = tickets.find(t => (!t.checkOutTime && (t.status === 'active' || t.status === 'ACTIVE')) && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
        if (!activeTicket) {
          await updateDoc(doc(db, 'slots', slot.id), {
            status: 'available',
            currentTicketId: null
          });
          count++;
        }
      }
      await logAudit('Reset Ô Không Hoạt Động', `${currentUser?.name} đã reset ${count} ô đỗ không hoạt động về trạng thái trống.`);
      showToast('success', `Đã reset ${count} ô đỗ không có xe hoạt động về trạng thái TRỐNG thành công!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi reset ô không hoạt động.');
    }
  };

  const handleResetSingleSlotToEmpty = async () => {
    if (!selectedSlotForEdit) return;
    if (!window.confirm(`Bạn có chắc chắn muốn reset ô đỗ ${selectedSlotForEdit.slotNumber} thành ô trống (available)?`)) return;
    try {
      await updateDoc(doc(db, 'slots', selectedSlotForEdit.id), {
        status: 'available',
        currentTicketId: null
      });
      for (const t of tickets) {
        if ((t.slotId === selectedSlotForEdit.id || t.slotNumber === selectedSlotForEdit.slotNumber) && !t.checkOutTime) {
          await updateDoc(doc(db, 'tickets', t.id), { status: 'cancelled', checkOutTime: new Date().toISOString() });
        }
      }
      await logAudit('Reset Ô Đỗ Thành Trống', `${currentUser?.name} đã reset ô đỗ ${selectedSlotForEdit.slotNumber} thành trống.`);
      showToast('success', `Đã reset ô đỗ ${selectedSlotForEdit.slotNumber} thành ô trống thành công!`);
      setShowEditSlotModal(false);
      setSelectedSlotForEdit(null);
    } catch (err) {
      showToast('error', 'Lỗi khi reset ô đỗ.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile & { password?: string };
        setCurrentUser(profile);
        localStorage.setItem('smart_parking_user', JSON.stringify(profile));
        showToast('success', `Đăng nhập Google thành công!`);
        if (!profile.password) {
          setNewPasswordInput('');
          setConfirmPasswordInput('');
          setShowSetPasswordModal(true);
        }
      } else {
        const userEmail = user.email || 'user@gmail.com';
        const profile: UserProfile & { password?: string } = {
          uid: user.uid,
          email: userEmail,
          name: user.displayName || userEmail.split('@')[0],
          role: 'customer',
          loyaltyPoints: 0,
          membershipTier: 'regular',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profile);
        setCurrentUser(profile);
        localStorage.setItem('smart_parking_user', JSON.stringify(profile));
        showToast('success', `Đăng nhập Google thành công với quyền Khách hàng!`);
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setShowSetPasswordModal(true);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Lỗi đăng nhập Google');
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      showToast('error', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showToast('error', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      const updated = { ...currentUser, password: newPasswordInput };
      setCurrentUser(updated);
      localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      await setDoc(doc(db, 'users', currentUser.uid), { password: newPasswordInput }, { merge: true });
      await logAudit('Tạo mật khẩu tài khoản Google', `${currentUser.name} (${currentUser.email}) đã tạo mật khẩu đăng nhập.`);
      setShowSetPasswordModal(false);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      showToast('success', 'Đã tạo mật khẩu đăng nhập thành công! Bạn có thể dùng email và mật khẩu này để đăng nhập sau này.');
    } catch (err) {
      showToast('error', 'Lỗi khi lưu mật khẩu.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginEmail || !loginPassword) {
      setAuthError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    try {
      const emailLower = loginEmail.trim().toLowerCase();
      const passwordClean = loginPassword.trim();

      // Check default admin
      if (emailLower === 'admin@parking.vn') {
        if (passwordClean === 'admin123456') {
          const adminProfile: UserProfile = {
            uid: 'admin_default',
            email: 'admin@parking.vn',
            name: 'Quản trị viên (Admin)',
            role: 'admin',
            membershipTier: 'regular',
            loyaltyPoints: 0,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'users', 'admin_default'), { ...adminProfile, password: 'admin123456' }, { merge: true });
          } catch (e) {
            console.warn('Sync default admin warn:', e);
          }
          setCurrentUser(adminProfile);
          localStorage.setItem('smart_parking_user', JSON.stringify(adminProfile));
          showToast('success', 'Đăng nhập Admin thành công!');
          return;
        } else {
          setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
          return;
        }
      }

      // Check default staff
      if (emailLower === 'staff@parking.vn') {
        if (passwordClean === 'staff123456') {
          const staffProfile: UserProfile = {
            uid: 'staff_default',
            email: 'staff@parking.vn',
            name: 'Nhân viên bãi đỗ',
            role: 'staff',
            membershipTier: 'regular',
            loyaltyPoints: 0,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'users', 'staff_default'), { ...staffProfile, password: 'staff123456' }, { merge: true });
          } catch (e) {
            console.warn('Sync default staff warn:', e);
          }
          setCurrentUser(staffProfile);
          localStorage.setItem('smart_parking_user', JSON.stringify(staffProfile));
          showToast('success', 'Đăng nhập Nhân viên thành công!');
          return;
        } else {
          setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
          return;
        }
      }

      // Query Firestore users collection
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      let foundUser: (UserProfile & { password?: string }) | null = null;
      for (const docSnap of querySnapshot.docs) {
        const u = docSnap.data() as UserProfile & { password?: string };
        if (u.email && u.email.trim().toLowerCase() === emailLower) {
          foundUser = u;
          break;
        }
      }

      if (!foundUser) {
        setAuthError('Tài khoản chưa được đăng ký');
        return;
      }

      const validUser: UserProfile & { password?: string } = foundUser;

      if (validUser.password && validUser.password.trim() !== passwordClean) {
        setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
        return;
      }

      setCurrentUser(validUser);
      localStorage.setItem('smart_parking_user', JSON.stringify(validUser));
      showToast('success', 'Đăng nhập thành công!');
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('smart_parking_user');
    setCurrentUser(null);
    showToast('success', 'Đăng xuất.');
  };

  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !chatInputText.trim()) return;
    try {
      const msgId = `msg_${Date.now()}`;
      const targetUid = currentUser.role === 'customer' ? currentUser.uid : selectedChatUserId;
      if (currentUser.role !== 'customer' && !targetUid) {
        showToast('error', 'Vui lòng chọn khách hàng để nhắn tin.');
        return;
      }
      const newMsg: SupportMessage & { targetUserId?: string } = {
        id: msgId,
        userId: targetUid,
        targetUserId: targetUid,
        userName: currentUser.name || currentUser.email,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        text: chatInputText.trim(),
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'support_messages', msgId), newMsg);
      setChatInputText('');
      showToast('success', 'Đã gửi tin nhắn hỗ trợ!');
    } catch (err) {
      showToast('error', 'Lỗi khi gửi tin nhắn.');
    }
  };

  const handleSendComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !complaintTitle.trim() || !complaintDesc.trim()) {
      showToast('error', 'Vui lòng điền đầy đủ tiêu đề và nội dung khiếu nại.');
      return;
    }
    try {
      const compId = `comp_${Date.now()}`;
      const newComp: SupportComplaint = {
        id: compId,
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.email,
        title: complaintTitle.trim(),
        category: complaintCategory,
        description: complaintDesc.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'support_complaints', compId), newComp);
      setComplaintTitle('');
      setComplaintDesc('');
      showToast('success', 'Đã gửi đơn khiếu nại đến Admin thành công!');
    } catch (err) {
      showToast('error', 'Lỗi khi gửi khiếu nại.');
    }
  };

  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reviewComment.trim()) {
      showToast('error', 'Vui lòng nhập nội dung đánh giá dịch vụ.');
      return;
    }
    if (!selectedTicketForReview) {
      showToast('error', 'Vui lòng chọn lượt đỗ xe đã hoàn tất (Completed) để đánh giá.');
      return;
    }

    try {
      const existingRev = supportReviews.find(r => r.ticketId === selectedTicketForReview.id);

      if (existingRev) {
        const hoursSince = (Date.now() - new Date(existingRev.createdAt).getTime()) / (1000 * 3600);
        if (hoursSince > 24) {
          showToast('error', 'Đã quá thời hạn 24 giờ để chỉnh sửa đánh giá.');
          return;
        }
        if (existingRev.updatedAt) {
          showToast('error', 'Bạn đã chỉnh sửa đánh giá này 1 lần trước đó và không thể chỉnh sửa thêm.');
          return;
        }

        await updateDoc(doc(db, 'support_reviews', existingRev.id), {
          rating: reviewRating,
          comment: reviewComment.trim(),
          updatedAt: new Date().toISOString()
        });
        showToast('success', 'Đã cập nhật đánh giá thành công (Chỉnh sửa lần 1 trong vòng 24h)!');
      } else {
        const revId = `rev_${Date.now()}`;
        const newRev: ServiceReview = {
          id: revId,
          ticketId: selectedTicketForReview.id,
          userId: currentUser.uid,
          userName: currentUser.name || currentUser.email,
          rating: reviewRating,
          comment: reviewComment.trim(),
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'support_reviews', revId), newRev);
        showToast('success', 'Đã gửi đánh giá dịch vụ cho lượt đỗ xe hoàn tất thành công!');
      }

      setReviewComment('');
      setReviewRating(5);
      setSelectedTicketForReview(null);
    } catch (err) {
      showToast('error', 'Lỗi khi gửi đánh giá.');
    }
  };

  const handleResolveComplaint = async (compId: string) => {
    try {
      await updateDoc(doc(db, 'support_complaints', compId), { status: 'resolved', adminResponse: 'Đã được Ban quản lý xử lý.' });
      showToast('success', 'Đã đánh dấu giải quyết khiếu nại.');
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật khiếu nại.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const changes: string[] = [];
      if ((editName || currentUser.name) !== currentUser.name) changes.push('Sửa tên');
      if (editPhone !== (currentUser.phoneNumber || '')) changes.push('Sửa số điện thoại');
      if (editAddress !== (currentUser.address || '')) changes.push('Sửa địa chỉ');
      if (editBirthDate !== (currentUser.birthDate || '')) changes.push('Sửa ngày sinh');
      if (editGender !== (currentUser.gender || 'Nam')) changes.push('Sửa giới tính');

      let passwordUpdateObj = {};
      if (editNewPassword) {
        if (editNewPassword !== editConfirmNewPassword) {
          showToast('error', 'Mật khẩu mới và xác nhận mật khẩu không khớp!');
          return;
        }
        if (editNewPassword.length < 6) {
          showToast('error', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
          return;
        }
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.data() as any;
        if (userData && userData.password && userData.password !== editCurrentPassword) {
          showToast('error', 'Mật khẩu hiện tại không chính xác!');
          return;
        }
        passwordUpdateObj = { password: editNewPassword };
        changes.push('Đổi mật khẩu');
      }

      const detailsStr = changes.length > 0 
        ? `${currentUser.name} (${currentUser.email}) đã cập nhật: ${changes.join(', ')}`
        : `${currentUser.name} (${currentUser.email}) đã cập nhật hồ sơ cá nhân`;

      const updated: UserProfile & { password?: string } = {
        ...currentUser,
        name: editName || currentUser.name,
        phoneNumber: editPhone,
        address: editAddress,
        birthDate: editBirthDate,
        gender: editGender,
        ...passwordUpdateObj
      };
      setCurrentUser(updated);
      localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      await logAudit('Sửa hồ sơ cá nhân', detailsStr);
      setShowEditProfileModal(false);
      setEditCurrentPassword('');
      setEditNewPassword('');
      setEditConfirmNewPassword('');
      showToast('success', 'Cập nhật hồ sơ và mật khẩu thành công!');
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật hồ sơ.');
    }
  };

  // VIETNAMESE LICENSE PLATE VALIDATION (Thông tư 79/2024/TT-BCA & Thông tư 81/2024/TT-BCA)
  const validateVietnameseLicensePlate = (plate: string): { isValid: boolean; formatted: string; reason?: string } => {
    if (!plate || !plate.trim()) {
      return { isValid: false, formatted: '', reason: 'Vui lòng nhập biển số xe.' };
    }

    const raw = plate.trim().toUpperCase().replace(/\s+/g, '');
    const clean = raw.replace(/[-.]/g, '');

    // Standard pattern according to Circular 79 & 81/2024/TT-BCA:
    // Province code: 11 to 99
    // Series: 1-2 letters, or letter+digit, or digit+letter (A, K, P1, 2A, LD, DA, MD, CD, NG, NN, QT, CV, etc.)
    // Sequence numbers: 4 or 5 digits
    const regexClean = /^([1-9][0-9])([A-Z]{1,2}|[A-Z][0-9]|[0-9][A-Z])([0-9]{4,5})$/;
    const match = clean.match(regexClean);

    if (!match) {
      return {
        isValid: false,
        formatted: raw,
        reason: 'Biển số không hợp lệ theo TT 79 & 81/2024/TT-BCA (Mã tỉnh 11-99 + Sê-ri + 4-5 số. Ví dụ: 29A-123.45, 51K-888.88, 59P1-123.45, 29LD-123.45).'
      };
    }

    const province = match[1];
    const series = match[2];
    const digits = match[3];

    const provNum = parseInt(province, 10);
    if (provNum < 11 || provNum > 99) {
      return {
        isValid: false,
        formatted: raw,
        reason: `Mã tỉnh '${province}' không hợp lệ (Mã tỉnh chuẩn Việt Nam từ 11 đến 99).`
      };
    }

    let formattedDigits = digits;
    if (digits.length === 5) {
      formattedDigits = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    const formatted = `${province}${series}-${formattedDigits}`;
    return { isValid: true, formatted };
  };

  // STRICT VALIDATION RULES ENFORCEMENT
  const validateParkingRules = (slot: ParkingSlot, vehicleType: string, isVip: boolean): string | null => {
    const isCarZone = slot.type === 'car_standard' || slot.type === 'car_vip';
    const isBikeOrElectric = vehicleType === 'motorbike' || vehicleType === 'electric';
    
    if (isCarZone && isBikeOrElectric) {
      return `Lỗi vi phạm quy tắc: Xe máy hoặc Xe điện TUYỆT ĐỐI KHÔNG ĐƯỢC phép đỗ vào khu vực Ô tô (${slot.zoneName})!`;
    }

    const isCarVehicle = vehicleType === 'car' || vehicleType === 'suv' || vehicleType === 'sedan';
    if ((slot.type === 'motorbike' || slot.type === 'electric') && isCarVehicle) {
      return `Lỗi vi phạm quy tắc: Ô tô không được phép đỗ vào khu vực Xe máy / Xe điện!`;
    }

    if (slot.type === 'car_vip') {
      const isCustomerRegular = currentUser?.role === 'customer' && currentUser?.membershipTier !== 'vip';
      if (isCustomerRegular || !isVip) {
        return `Lỗi vi phạm quy tắc: Bạn đang là Khách hàng Thường (0 điểm), KHÔNG ĐƯỢC PHÉP gửi xe vào ô VIP! Chỉ có Khách hàng VIP mới được đỗ ô VIP.`;
      }
    }

    return null;
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForCheckIn) return;
    setValidationError('');

    const errorMsg = validateParkingRules(selectedSlotForCheckIn, checkInVehicleType, checkInIsVip);
    if (errorMsg) {
      setValidationError(errorMsg);
      showToast('error', 'Vi phạm quy tắc đỗ xe!');
      return;
    }

    const plateValidation = validateVietnameseLicensePlate(checkInPlate);
    if (!plateValidation.isValid) {
      setValidationError(plateValidation.reason || 'Biển số xe không hợp lệ theo quy định Thông tư 79 & 81/2024/TT-BCA!');
      showToast('error', 'Biển số xe không đúng định dạng!');
      return;
    }

    const normalizedPlate = plateValidation.formatted.trim().toUpperCase();
    
    // Query Firestore directly to avoid any local state race conditions
    let existingTickets: ParkingTicket[] = tickets;
    try {
      const ticketsSnap = await getDocs(collection(db, 'tickets'));
      existingTickets = ticketsSnap.docs.map(doc => doc.data() as ParkingTicket);
    } catch (e) {
      console.warn("Error fetching tickets for duplicate check:", e);
    }

    const isDuplicate = existingTickets.some(
      (ticket) => 
        (ticket.licensePlate || '').trim().toUpperCase() === normalizedPlate && 
        (!ticket.checkOutTime) &&
        (ticket.status === 'PENDING' || ticket.status === 'ACTIVE' || ticket.status === 'pending' || ticket.status === 'active')
    );

    if (isDuplicate) {
      const warningMsg = "Cảnh báo: Biển số xe này đang có vé hoạt động hoặc đang chờ duyệt, không được phép tạo thêm vé trùng lặp!";
      alert(warningMsg);
      showToast('error', warningMsg);
      setValidationError(warningMsg);
      return; // Ngăn không cho tạo vé mới
    }

    try {
      const ticketId = `ticket_${Date.now()}`;
      const nowStr = new Date().toISOString();
      
      const newTicket: ParkingTicket = {
        id: ticketId,
        slotId: selectedSlotForCheckIn.id,
        slotNumber: selectedSlotForCheckIn.slotNumber,
        licensePlate: plateValidation.formatted,
        vehicleType: checkInVehicleType,
        isVip: checkInIsVip,
        customerName: checkInCustomerName || currentUser?.name || 'Khách vãng lai',
        phoneNumber: checkInPhone || currentUser?.phoneNumber || 'Chưa cập nhật',
        userId: currentUser?.uid || '',
        checkInTime: nowStr,
        createdAt: nowStr,
        status: 'pending', // Strict pending status assignment
        paymentStatus: 'unpaid',
      };

      if (currentUser?.uid && (currentUser.role === 'staff' || currentUser.role === 'admin')) {
        newTicket.staffId = currentUser.uid;
      }

      // Immediate local state update to ensure UI instantly reflects CHỜ XÁC NHẬN (PENDING)
      setTickets(prev => [newTicket, ...prev]);

      await setDoc(doc(db, 'tickets', ticketId), newTicket);

      const notifMsg = `Yêu cầu giữ chỗ mới tại ô ${selectedSlotForCheckIn.slotNumber} (Biển số: ${plateValidation.formatted}) đang chờ xác nhận. Vui lòng quét QR hoặc duyệt vào bãi.`;

      await sendNotification('staff_admin', '⏳ Yêu cầu gửi xe mới chờ duyệt', notifMsg, 'booking', ticketId);

      setShowCheckInModal(false);
      setSelectedSlotForCheckIn(null);
      setCheckInPlate('');
      setCheckInCustomerName('');
      setCheckInPhone('');
      setCheckInIsVip(false);

      if (currentUser?.role === 'customer') {
        setActiveTab('my_qr');
      } else {
        setActiveTab('staff_scanner');
      }

      const successMsg = `Đã gửi yêu cầu giữ chỗ ô ${selectedSlotForCheckIn.slotNumber} (Biển số: ${plateValidation.formatted}) thành công!\nTrạng thái: CHỜ XÁC NHẬN (PENDING).\nVui lòng chờ Nhân viên/Admin quét mã QR để duyệt vào bãi.`;
      alert(successMsg);
      showToast('success', successMsg);
    } catch (err: any) {
      setValidationError(err.message);
      showToast('error', 'Lỗi khi gửi xe.');
    }
  };

  const handleTopUpWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountToTopUp = customTopUpInput ? parseInt(customTopUpInput, 10) : topUpAmount;
    if (!amountToTopUp || amountToTopUp <= 0) {
      showToast('error', 'Vui lòng chọn hoặc nhập số tiền nạp hợp lệ.');
      return;
    }

    const target = topUpTargetUser || currentUser;
    if (!target) return;

    try {
      // Record wallet transaction with 'pending' status for Admin/Staff confirmation
      const transId = `trans_${Date.now()}`;
      const newTrans: WalletTransaction = {
        id: transId,
        userId: target.uid,
        userName: target.name || target.email || 'Khách hàng',
        type: 'topup',
        amount: amountToTopUp,
        description: `Nạp tiền qua Chuyển khoản VietQR Ngân hàng MB Bank (STK 7920141546131)`,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      await setDoc(doc(db, 'wallet_transactions', transId), newTrans);

      await sendNotification('staff_admin', '💰 Yêu cầu nạp ví mới', `Khách hàng ${target.name} vừa gửi yêu cầu nạp ${amountToTopUp.toLocaleString('vi-VN')} đ cần đối soát và duyệt.`, 'payment');

      setShowTopUpModal(false);
      setCustomTopUpInput('');
      setTopUpTargetUser(null);
      showToast('success', `Đã gửi yêu cầu nạp ${amountToTopUp.toLocaleString('vi-VN')} đ! Vui lòng chờ Admin hoặc Nhân viên đối soát và duyệt.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi khi gửi yêu cầu nạp tiền vào ví.');
    }
  };

  const handleCheckOut = async (ticket: ParkingTicket, method: 'cash' | 'transfer' | 'wallet' = selectedPaymentMethod) => {
    try {
      const checkOutTime = new Date();
      const checkInDate = new Date(ticket.checkInTime);
      const diffHours = Math.max(0, (checkOutTime.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
      const diffShifts = Math.max(1, Math.ceil(diffHours / 7));
      
      let baseRate = tariffSettings.carStandardRate;
      if (ticket.vehicleType === 'motorbike') {
        baseRate = tariffSettings.motorbikeRate;
      } else if (ticket.vehicleType === 'electric') {
        baseRate = tariffSettings.electricRate;
      } else if (ticket.isVip || ticket.slotId?.includes('B')) {
        baseRate = tariffSettings.carVipRate;
      } else {
        baseRate = tariffSettings.carStandardRate;
      }

      const checkOutHour = checkOutTime.getHours();
      let surchargeMultiplier = 1.0;
      if ((checkOutHour >= 7 && checkOutHour < 9) || (checkOutHour >= 17 && checkOutHour < 19)) {
        surchargeMultiplier = 1 + (tariffSettings.peakHourSurchargePercent / 100);
      } else if (checkOutHour >= 22 || checkOutHour < 6) {
        surchargeMultiplier = 1 + (tariffSettings.nightHourSurchargePercent / 100);
      }

      const totalFee = Math.round(diffShifts * baseRate * surchargeMultiplier);
      const pointsEarned = totalFee / 20000;

      // Handle Wallet Deduction if payment method is wallet
      if (method === 'wallet') {
        let userToDeduct = usersList.find(u => u.name === ticket.customerName || u.phoneNumber === ticket.phoneNumber) || currentUser;
        const currentBal = userToDeduct?.walletBalance ?? 200000;

        if (currentBal < totalFee) {
          showToast('error', `Số dư ví không đủ! (Còn ${currentBal.toLocaleString('vi-VN')} đ, cần ${totalFee.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền vào ví.`);
          setTopUpTargetUser(userToDeduct);
          setTopUpAmount(Math.max(50000, totalFee - currentBal));
          setShowTopUpModal(true);
          return;
        }

        const newBal = currentBal - totalFee;

        if (userToDeduct) {
          await setDoc(doc(db, 'users', userToDeduct.uid), { walletBalance: newBal }, { merge: true });

          const transId = `trans_${Date.now()}`;
          await setDoc(doc(db, 'wallet_transactions', transId), {
            id: transId,
            userId: userToDeduct.uid,
            userName: userToDeduct.name || userToDeduct.email,
            type: 'payment',
            amount: totalFee,
            description: `Thanh toán phí gửi xe ô ${ticket.slotNumber} (${ticket.licensePlate})`,
            createdAt: new Date().toISOString(),
            status: 'approved'
          });

          if (currentUser && userToDeduct.uid === currentUser.uid) {
            const updated = { ...currentUser, walletBalance: newBal };
            setCurrentUser(updated);
            localStorage.setItem('smart_parking_user', JSON.stringify(updated));
          }
          await syncLatestUserData();
        }

        // Complete ticket immediately when paid via pre-funded wallet
        await updateDoc(doc(db, 'tickets', ticket.id), {
          status: 'completed',
          checkOutTime: checkOutTime.toISOString(),
          fee: totalFee,
          paymentMethod: method,
          paymentStatus: 'paid',
          pointsEarned
        });

        await updateDoc(doc(db, 'slots', ticket.slotId), {
          status: 'available',
          currentTicketId: null
        });

        if (userToDeduct) {
          const currentPoints = userToDeduct.loyaltyPoints || 0;
          const newPoints = Number((currentPoints + pointsEarned).toFixed(2));
          const newTier: 'regular' | 'vip' = newPoints >= 300 ? 'vip' : 'regular';
          try {
            await updateDoc(doc(db, 'users', userToDeduct.uid), {
              loyaltyPoints: newPoints,
              membershipTier: newTier
            });
          } catch {}

          if (currentUser && userToDeduct.uid === currentUser.uid) {
            const updatedUser = { ...currentUser, loyaltyPoints: newPoints, membershipTier: newTier };
            setCurrentUser(updatedUser);
            localStorage.setItem('smart_parking_user', JSON.stringify(updatedUser));
          }
        }

        setShowCheckOutModal(false);
        setSelectedTicketForCheckOut(null);

        await sendNotification(userToDeduct?.uid || ticket.customerName, '⭐ Lượt đỗ xe hoàn tất - Đánh giá ngay', `Lượt đỗ xe tại ô ${ticket.slotNumber} đã hoàn tất. Hãy chia sẻ đánh giá dịch vụ ngay để nhận điểm thưởng!`, 'review', ticket.id);

        showToast('success', `Check-out thành công! Trừ ${totalFee.toLocaleString('vi-VN')} đ từ ví, cộng +${Number(pointsEarned.toFixed(2))} điểm. Ô ${ticket.slotNumber} đã trống.`);
        return;
      }

      // For Transfer (VietQR) or Cash: Move ticket to 'pending_approval'
      // Note: Reward points will be awarded ONLY after payment is confirmed/approved by Admin/Staff.
      await updateDoc(doc(db, 'tickets', ticket.id), {
        fee: totalFee,
        paymentMethod: method,
        paymentStatus: 'pending_approval',
        requestedAt: new Date().toISOString(),
        checkOutTime: checkOutTime.toISOString(),
        pointsEarned
      });

      await sendNotification('staff_admin', '💰 Yêu cầu xác nhận thanh toán', `Khách hàng ${ticket.customerName} vừa yêu cầu thanh toán ${totalFee.toLocaleString('vi-VN')} đ cho ô ${ticket.slotNumber} cần duyệt.`, 'payment', ticket.id);

      setShowCheckOutModal(false);
      setSelectedTicketForCheckOut(null);
      const methodLabel = method === 'transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt';
      showToast('success', `Đã chuyển sang mục CHỜ XÁC NHẬN! Vui lòng chờ Admin/Nhân viên duyệt thanh toán ${totalFee.toLocaleString('vi-VN')} đ (${methodLabel}). Điểm thưởng (+${Number(pointsEarned.toFixed(2))} điểm) sẽ được cộng sau khi xác nhận thanh toán thành công.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi khi yêu cầu thanh toán.');
    }
  };

  const handleApproveTicketPayment = async (ticket: ParkingTicket) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        status: 'completed',
        paymentStatus: 'paid'
      });

      await updateDoc(doc(db, 'slots', ticket.slotId), {
        status: 'available',
        currentTicketId: null
      });

      let addedPointsStr = '';
      if (ticket.pointsEarned && ticket.customerName) {
        const custUser = usersList.find(u => 
          (u.name && u.name.trim().toLowerCase() === ticket.customerName.trim().toLowerCase()) || 
          (u.phoneNumber && ticket.phoneNumber && u.phoneNumber === ticket.phoneNumber) ||
          (u.email && u.email.trim().toLowerCase() === ticket.customerName.trim().toLowerCase())
        );

        if (custUser) {
          const currentPoints = custUser.loyaltyPoints || 0;
          const newPoints = Number((currentPoints + ticket.pointsEarned).toFixed(2));
          const newTier: 'regular' | 'vip' = newPoints >= 300 ? 'vip' : 'regular';
          await updateDoc(doc(db, 'users', custUser.uid), {
            loyaltyPoints: newPoints,
            membershipTier: newTier
          });

          if (currentUser && currentUser.uid === custUser.uid) {
            const updated = { ...currentUser, loyaltyPoints: newPoints, membershipTier: newTier };
            setCurrentUser(updated);
            localStorage.setItem('smart_parking_user', JSON.stringify(updated));
          }
          addedPointsStr = ` Đã cộng +${Number(ticket.pointsEarned.toFixed(2))} điểm thưởng cho ${custUser.name}.`;
        } else if (currentUser && currentUser.role === 'customer') {
          const currentPoints = currentUser.loyaltyPoints || 0;
          const newPoints = Number((currentPoints + ticket.pointsEarned).toFixed(2));
          const newTier: 'regular' | 'vip' = newPoints >= 300 ? 'vip' : 'regular';
          await updateDoc(doc(db, 'users', currentUser.uid), {
            loyaltyPoints: newPoints,
            membershipTier: newTier
          });
          const updated = { ...currentUser, loyaltyPoints: newPoints, membershipTier: newTier };
          setCurrentUser(updated);
          localStorage.setItem('smart_parking_user', JSON.stringify(updated));
          addedPointsStr = ` Đã cộng +${Number(ticket.pointsEarned.toFixed(2))} điểm thưởng.`;
        }
      }

      await logAudit('Xác Nhận Thanh Toán', `${currentUser?.name} (${currentUser?.role}) đã xác nhận thanh toán vé xe ${ticket.licensePlate} (${ticket.fee ? ticket.fee.toLocaleString('vi-VN') : 0} đ).`);
      await sendNotification(ticket.userId || ticket.customerName, '✅ Thanh toán & Đỗ xe hoàn tất - Đánh giá ngay', `Thanh toán số tiền ${ticket.fee ? ticket.fee.toLocaleString('vi-VN') : 0} đ cho ô ${ticket.slotNumber} đã được duyệt thành công! Lượt đỗ xe đã hoàn tất. Hãy gửi đánh giá dịch vụ ngay.`, 'review', ticket.id);
      showToast('success', `Đã DUYỆT thanh toán cho xe ${ticket.licensePlate}!${addedPointsStr} Ô đỗ ${ticket.slotNumber} đã được giải phóng.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi duyệt thanh toán.');
    }
  };

  const handleApproveCheckIn = async (ticket: ParkingTicket) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        status: 'active',
        staffId: currentUser?.uid
      });
      await updateDoc(doc(db, 'slots', ticket.slotId), {
        status: 'occupied',
        currentTicketId: ticket.id
      });
      await sendNotification(ticket.userId || ticket.customerName, '✅ Đã duyệt xe vào bãi', `Vé xe ${ticket.licensePlate} tại ô ${ticket.slotNumber} đã được Nhân viên duyệt vào bãi thành công.`, 'booking', ticket.id);
      await logAudit('Duyệt Xe Vào Bãi (QR)', `${currentUser?.name} đã duyệt cho xe ${ticket.licensePlate} vào ô ${ticket.slotNumber}.`);
      showToast('success', `Đã duyệt thành công xe ${ticket.licensePlate} vào ô ${ticket.slotNumber}!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi duyệt xe vào bãi.');
    }
  };

  const handleRejectCheckIn = async (ticket: ParkingTicket) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        status: 'cancelled',
        staffId: currentUser?.uid
      });
      await updateDoc(doc(db, 'slots', ticket.slotId), {
        status: 'available',
        currentTicketId: null
      });
      await sendNotification(ticket.userId || ticket.customerName, '❌ Đăng ký giữ chỗ bị từ chối', `Vé giữ chỗ ô ${ticket.slotNumber} (Biển số: ${ticket.licensePlate}) đã bị từ chối bởi Nhân viên.`, 'system', ticket.id);
      await logAudit('Từ Chối Giữ Chỗ (QR)', `${currentUser?.name} đã từ chối vé giữ chỗ ${ticket.licensePlate}.`);
      showToast('success', `Đã TỪ CHỐI vé giữ chỗ xe ${ticket.licensePlate}. Ô đỗ đã được giải phóng.`);
      setScannedTicketResult(null);
      setScannerInputCode('');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi từ chối vé.');
    }
  };

  const handleHoldOrRejectCheckOut = async (ticket: ParkingTicket) => {
    try {
      await sendNotification(ticket.userId || ticket.customerName, '⚠️ Xe chưa được phép rời bãi', `Yêu cầu lấy xe ${ticket.licensePlate} ra khỏi bãi tạm giữ do chưa hoàn tất thủ tục thanh toán hoặc kiểm tra.`, 'system', ticket.id);
      await logAudit('Giữ Xe Tại Bãi', `${currentUser?.name} đã giữ xe ${ticket.licensePlate} lại bãi.`);
      showToast('success', `Đã giữ xe ${ticket.licensePlate} lại bãi và gửi thông báo.`);
      setScannedTicketResult(null);
      setScannerInputCode('');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi thao tác giữ xe.');
    }
  };

  const handleRejectTicketPayment = async (ticket: ParkingTicket) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        paymentStatus: 'rejected'
      });
      await sendNotification(ticket.userId || ticket.customerName, '❌ Thanh toán bị từ chối', `Yêu cầu thanh toán cho vé xe ${ticket.licensePlate} đã bị từ chối. Vui lòng liên hệ nhân viên.`, 'payment', ticket.id);
      await logAudit('Từ Chối Thanh Toán', `${currentUser?.name} đã từ chối thanh toán vé xe ${ticket.licensePlate}.`);
      showToast('success', `Đã TỪ CHỐI yêu cầu thanh toán xe ${ticket.licensePlate}. Vé đỗ xe quay lại trạng thái chưa thanh toán.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi từ chối thanh toán.');
    }
  };

  const handleApproveWalletTopUp = async (trans: WalletTransaction) => {
    try {
      const targetUser = usersList.find(u => u.uid === trans.userId);
      const currentBal = targetUser?.walletBalance ?? 200000;
      const newBal = currentBal + trans.amount;

      await setDoc(doc(db, 'users', trans.userId), { walletBalance: newBal }, { merge: true });

      await updateDoc(doc(db, 'wallet_transactions', trans.id), {
        status: 'approved'
      });

      if (currentUser && currentUser.uid === trans.userId) {
        const updated = { ...currentUser, walletBalance: newBal };
        setCurrentUser(updated);
        localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      }

      await syncLatestUserData();

      await logAudit('Xác Nhận Nạp Ví', `${currentUser?.name} (${currentUser?.role}) đã duyệt nạp ${trans.amount.toLocaleString('vi-VN')} đ vào ví cho ${trans.userName}.`);
      await sendNotification(trans.userId, '💳 Nạp ví thành công', `Yêu cầu nạp ${trans.amount.toLocaleString('vi-VN')} đ vào ví của bạn đã được duyệt thành công!`, 'payment');
      showToast('success', `Đã DUYỆT nạp ${trans.amount.toLocaleString('vi-VN')} đ vào ví cho ${trans.userName}!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi duyệt nạp tiền ví.');
    }
  };

  const handleRejectWalletTopUp = async (trans: WalletTransaction) => {
    try {
      await updateDoc(doc(db, 'wallet_transactions', trans.id), {
        status: 'rejected'
      });
      showToast('success', `Đã TỪ CHỐI yêu cầu nạp tiền ví của ${trans.userName}.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi từ chối nạp tiền ví.');
    }
  };

  const handleApproveRefund = async (trans: WalletTransaction) => {
    try {
      const targetUser = usersList.find(u => u.uid === trans.userId);
      const currentBal = targetUser?.walletBalance ?? 200000;
      const newBal = currentBal + trans.amount;

      await setDoc(doc(db, 'users', trans.userId), { walletBalance: newBal }, { merge: true });
      await updateDoc(doc(db, 'wallet_transactions', trans.id), { status: 'approved' });

      if (currentUser && currentUser.uid === trans.userId) {
        const updated = { ...currentUser, walletBalance: newBal };
        setCurrentUser(updated);
        localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      }

      await syncLatestUserData();

      await logAudit('Duyệt Hoàn Tiền', `${currentUser?.name} (${currentUser?.role}) đã duyệt hoàn tiền ${trans.amount.toLocaleString('vi-VN')} đ cho khách hàng ${trans.userName}.`);
      await sendNotification(trans.userId, '💳 Hoàn tiền thành công', `Yêu cầu hoàn tiền ${trans.amount.toLocaleString('vi-VN')} đ vào ví của bạn đã được duyệt thành công!`, 'payment');
      showToast('success', `Đã DUYỆT hoàn tiền ${trans.amount.toLocaleString('vi-VN')} đ cho khách hàng ${trans.userName}!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi duyệt hoàn tiền.');
    }
  };

  const handleManualOpenBarrier = async (slotNumber?: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'staff')) {
      showToast('error', 'Chỉ có Nhân viên hoặc Admin mới có quyền mở barrier thủ công.');
      return;
    }
    const target = slotNumber ? `ô đỗ ${slotNumber}` : 'Cổng chính / Toàn bãi';
    try {
      await logAudit('Mở Barrier Thủ Công', `${currentUser.name} (${currentUser.role}) đã thực hiện MỞ BARRIER THỦ CÔNG cho ${target} đảm bảo an ninh vận hành.`);
      showToast('success', `Đã phát lệnh MỞ BARRIER THỦ CÔNG cho ${target} thành công! Cổng barrier đã được nâng lên.`);
    } catch (e) {
      console.error(e);
      showToast('error', 'Lỗi khi mở barrier thủ công.');
    }
  };

  const handleAddSlot = async () => {
    const slotNum = prompt('Nhập số ô đỗ mới (VD: A09, B05):');
    if (!slotNum) return;
    const zoneTypeChoice = prompt('Chọn loại khu vực:\n1. car_standard\n2. car_vip\n3. motorbike\n4. electric', 'car_standard');
    
    let type: SlotType = 'car_standard';
    let zoneId = 'zone_a';
    let zoneName = 'Khu Ô tô Thường (Zone A)';

    if (zoneTypeChoice === '2') { type = 'car_vip'; zoneId = 'zone_b'; zoneName = 'Khu Ô tô VIP (Zone B)'; }
    else if (zoneTypeChoice === '3') { type = 'motorbike'; zoneId = 'zone_c'; zoneName = 'Khu Xe máy (Zone C)'; }
    else if (zoneTypeChoice === '4') { type = 'electric'; zoneId = 'zone_d'; zoneName = 'Khu Xe điện & Sạc (Zone D)'; }

    const newSlotId = `slot_${Date.now()}`;
    try {
      await setDoc(doc(db, 'slots', newSlotId), {
        id: newSlotId,
        slotNumber: slotNum.toUpperCase(),
        zoneId,
        zoneName,
        type,
        status: 'available'
      });
      showToast('success', `Đã thêm ô đỗ ${slotNum.toUpperCase()} thành công!`);
    } catch (err) {
      showToast('error', 'Lỗi khi thêm ô đỗ.');
    }
  };

  const handleOpenEditSlot = (slot: ParkingSlot) => {
    setSelectedSlotForEdit(slot);
    setEditSlotNumber(slot.slotNumber);
    setEditSlotType(slot.type);
    setShowEditSlotModal(true);
  };

  const handleSaveEditSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForEdit) return;

    let zoneId = 'zone_a';
    let zoneName = 'Khu Ô tô Thường (Zone A)';
    if (editSlotType === 'car_vip') { zoneId = 'zone_b'; zoneName = 'Khu Ô tô VIP (Zone B)'; }
    else if (editSlotType === 'motorbike') { zoneId = 'zone_c'; zoneName = 'Khu Xe máy (Zone C)'; }
    else if (editSlotType === 'electric') { zoneId = 'zone_d'; zoneName = 'Khu Xe điện & Sạc (Zone D)'; }

    try {
      await updateDoc(doc(db, 'slots', selectedSlotForEdit.id), {
        slotNumber: editSlotNumber.toUpperCase(),
        type: editSlotType,
        zoneId,
        zoneName
      });
      setShowEditSlotModal(false);
      setSelectedSlotForEdit(null);
      showToast('success', `Cập nhật thông tin ô đỗ ${editSlotNumber.toUpperCase()} thành công!`);
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật ô đỗ.');
    }
  };

  const handleDeleteSlot = async (slotId: string, slotNumber: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ô đỗ ${slotNumber}?`)) return;
    try {
      await deleteDoc(doc(db, 'slots', slotId));
      showToast('success', `Đã xóa ô đỗ ${slotNumber}!`);
    } catch (err) {
      showToast('error', 'Lỗi khi xóa ô đỗ.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-lg">Đang kết nối hệ thống Smart Parking...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
          <div className="text-center mb-6">
            <div className="bg-white/10 border border-white/20 p-2.5 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg backdrop-blur">
              <img src="/assets/aistudio/image_6150025b.png" alt="Smart Parking Logo" className="w-16 h-16 object-contain rounded-xl" />
            </div>
            <h1 className="text-2xl font-bold">Smart Parking System</h1>
            <p className="text-slate-400 text-sm mt-1">Hệ thống Quản lý Bãi đỗ xe Thông minh & Tích điểm</p>
          </div>

          {authError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
              {authError}
            </div>
          )}

          {/* Auth Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-700">
            <button
              onClick={() => setAuthTab('quick')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authTab === 'quick' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              ⚡ Đăng nhập nhanh
            </button>
            <button
              onClick={() => setAuthTab('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authTab === 'register' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              📝 Đăng ký tài khoản
            </button>
          </div>

          {authTab === 'quick' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email đăng nhập <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg transition shadow-lg shadow-emerald-500/20 text-sm"
              >
                Đăng nhập hệ thống
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">hoặc</span>
                <div className="flex-grow border-t border-slate-700"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Đăng nhập với Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Họ và tên <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email đăng ký <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Số điện thoại <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Địa chỉ <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Số nhà, đường, quận/huyện..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <p className="text-slate-400 text-[11px] italic">
                * Hạng thành viên mặc định là Khách hàng Thường (0 điểm) khi đăng ký mới.
              </p>
              <button
                type="submit"
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg transition shadow-lg shadow-emerald-500/20 text-sm"
              >
                Đăng ký & Đăng nhập ngay
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const totalSlotsCount = slots.length;
  const activeTicketsList = tickets.filter(t => !t.checkOutTime && (t.status === 'active' || t.status === 'ACTIVE'));
  const occupiedSlotsCount = activeTicketsList.length;
  const pendingSlotsCount = slots.filter(slot => {
    return tickets.some(t => (t.status === 'pending' || t.status === 'PENDING') && (t.slotId === slot.id || t.slotNumber === slot.slotNumber));
  }).length;
  const availableSlotsCount = Math.max(0, totalSlotsCount - occupiedSlotsCount - pendingSlotsCount);
  const totalRevenue = tickets.reduce((sum, t) => sum + (t.fee || 0), 0);

  // Strict Privacy & Access Control for Customers:
  const myTickets = currentUser?.role === 'customer'
    ? tickets.filter(t => 
        (t.customerName && currentUser.name && t.customerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
        (currentUser.phoneNumber && t.phoneNumber && t.phoneNumber === currentUser.phoneNumber) ||
        (currentUser.email && t.customerName && t.customerName.toLowerCase().includes(currentUser.email.split('@')[0].toLowerCase()))
      )
    : tickets;

  const pendingTicketsList = myTickets.filter(t => t.paymentStatus === 'pending_approval' || t.status === 'pending' || t.status === 'PENDING');
  const pendingWalletTransList = currentUser?.role === 'customer'
    ? walletTransactions.filter(wt => wt.status === 'pending' && wt.userId === currentUser.uid)
    : walletTransactions.filter(wt => wt.status === 'pending');
  const totalPendingCount = pendingWalletTransList.length;

  const myNotifications = currentUser 
    ? notifications.filter(n => {
        if (n.userId === 'all') return true;
        if (currentUser.role === 'admin' || currentUser.role === 'staff') {
          return n.userId === 'staff_admin' || n.userId === currentUser.uid || n.userId === currentUser.email;
        }
        return n.userId === currentUser.uid || n.userId === currentUser.email || (currentUser.name && n.message?.toLowerCase().includes(currentUser.name.toLowerCase()));
      })
    : [];

  const unreadNotificationsCount = myNotifications.filter(n => !n.isRead).length;

  const filteredSlots = slots.filter(slot => {
    const pendingTicket = tickets.find(t => (t.status === 'pending' || t.status === 'PENDING') && (t.slotId === slot.id || t.slotNumber === slot.slotNumber));
    const activeTicket = tickets.find(t => (!t.checkOutTime && (t.status === 'active' || t.status === 'ACTIVE')) && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
    const isPending = !!pendingTicket;
    const isOccupied = !!activeTicket || slot.status === 'occupied';
    const slotStatus = isPending ? 'pending' : (isOccupied ? 'occupied' : 'available');

    if (filterZone !== 'all' && slot.zoneId !== filterZone) return false;
    if (filterStatus !== 'all' && slotStatus !== filterStatus) return false;
    if (searchQuery && !slot.slotNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));

  const activeBg = BG_THEMES.find(t => t.id === (currentUser?.bgTheme || 'cyber-dark')) || BG_THEMES[0];
  const activeBgUrl = currentUser?.bgTheme === 'custom' && currentUser?.bgCustomUrl 
    ? currentUser.bgCustomUrl 
    : (activeBg.imageUrl || BG_THEMES[0].imageUrl);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden transition-colors duration-700">
      {/* Real Fullscreen Parking Lot Wallpaper Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
        {activeBgUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105" 
            style={{ backgroundImage: `url(${activeBgUrl})` }}
          ></div>
        )}
        {/* Dark Backdrop Glassmorphism Overlay for 100% Text & UI Legibility */}
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-all duration-700"></div>

        {/* Subtle Ambient Accent Spotlights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-emerald-500/20"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-indigo-500/20"></div>
      </div>

      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all animate-bounce ${toastMessage.type === 'success' ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200' : 'bg-red-950 border-red-500/50 text-red-200'}`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Wrapper - strictly z-10 above background layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
                <header className={`backdrop-blur border-b sticky top-0 z-40 px-6 py-3 flex flex-row items-center justify-between flex-nowrap gap-4 shadow-lg w-full overflow-x-auto ${currentUser.role === 'customer' ? 'bg-emerald-950/90 border-emerald-500/30' : 'bg-slate-900/95 border-slate-800'}`}>
          {currentUser.role === 'customer' ? (
            <>
              {/* Customer Portal Left Branding */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  title="Mở menu danh mục khách hàng"
                  className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl transition cursor-pointer flex items-center justify-center shadow-md active:scale-95 shrink-0"
                >
                  <Menu className="w-5 h-5 text-emerald-400" />
                </button>
                <div className="bg-emerald-500/20 border border-emerald-500/40 p-1.5 rounded-xl shadow-sm text-emerald-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                    Cổng Khách Hàng Smart Parking
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-slate-950 uppercase">
                      {currentUser.membershipTier === 'vip' ? 'VIP MEMBER' : 'REGULAR'}
                    </span>
                  </h1>
                  <p className="text-[11px] text-emerald-300">Xin chào, {currentUser.name} • Tích điểm: <strong className="text-amber-400">{Number((currentUser.loyaltyPoints || 0).toFixed(2))} điểm</strong></p>
                </div>
              </div>

              {/* Customer Portal Center Quick Navigation Tabs */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'map' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Sơ đồ bãi xe
                </button>
                <button
                  onClick={() => setActiveTab('my_qr')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'my_qr' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  <QrCode className="w-3.5 h-3.5" /> Mã QR của tôi
                </button>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'tickets' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  <History className="w-3.5 h-3.5" /> Lịch sử ({myTickets.length})
                </button>
                <button
                  onClick={() => setActiveTab('wallet_history')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'wallet_history' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Lịch sử ví ({walletTransactions.filter(wt => wt.userId === currentUser.uid).length})
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'support' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  <Headphones className="w-3.5 h-3.5" /> Hỗ trợ KH
                </button>
              </div>

              {/* Customer Right Side Widgets */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Real-time stats pills for customer */}
                <div className="hidden xl:flex items-center gap-2.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs shadow-inner">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Tổng ô:</span>
                    <span className="font-bold text-white">{totalSlotsCount}</span>
                  </div>
                  <div className="w-px h-3.5 bg-slate-800"></div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400">Trống:</span>
                    <span className="font-bold text-emerald-400">{availableSlotsCount}</span>
                  </div>
                  <div className="w-px h-3.5 bg-slate-800"></div>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400">Chờ duyệt:</span>
                    <span className="font-bold text-amber-400">{pendingSlotsCount}</span>
                  </div>
                  <div className="w-px h-3.5 bg-slate-800"></div>
                  <div className="flex items-center gap-1">
                    <span className="text-rose-400">Đang đỗ:</span>
                    <span className="font-bold text-rose-400">{occupiedSlotsCount}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowQuickCheckOutListModal(true)}
                  title="Lấy xe ra khỏi bãi (Check-out)"
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                >
                  <Car className="w-3.5 h-3.5" /> Lấy xe ra
                </button>

                <button
                  onClick={() => setShowNotificationsModal(true)}
                  title="Trung tâm thông báo"
                  className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-slate-200 hover:text-white flex items-center justify-center shrink-0"
                >
                  <Bell className="w-4 h-4 text-emerald-400" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-md animate-pulse">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <div className="bg-slate-950 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs shadow-inner">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-sm">
                      {(currentUser.walletBalance ?? 200000).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <button
                    onClick={() => { setTopUpTargetUser(currentUser); setShowTopUpModal(true); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition shadow cursor-pointer"
                  >
                    + Nạp ví
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Admin / Staff Operational Header Left */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  title="Mở menu quản trị & vận hành"
                  className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl transition cursor-pointer flex items-center justify-center shadow-md active:scale-95 shrink-0"
                >
                  <Menu className="w-5 h-5 text-purple-400" />
                </button>

                <div className="bg-white/10 border border-white/20 p-1.5 rounded-xl shadow-sm">
                  <img src="/assets/aistudio/image_6150025b.png" alt="Smart Parking Logo" className="w-8 h-8 object-contain rounded-lg" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    Hệ Thống Quản Trị & Vận Hành
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${currentUser.role === 'admin' ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40' : 'bg-blue-500/30 text-blue-200 border border-blue-500/40'}`}>
                      {currentUser.role === 'admin' ? 'ADMIN COMMAND' : 'STAFF OPS'}
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-300">Quản lý bãi xe thời gian thực</p>
                </div>
              </div>

              {/* Admin / Staff Operational Header Right */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden lg:flex items-center gap-3 bg-slate-950/90 px-4 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">Tổng ô:</span>
                    <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{totalSlotsCount}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-800"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-medium">Trống:</span>
                    <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">{availableSlotsCount}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-800"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-medium">Chờ duyệt:</span>
                    <span className="font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">{pendingSlotsCount}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-800"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-medium">Đang đỗ:</span>
                    <span className="font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">{occupiedSlotsCount}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-800"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-indigo-400 font-medium">Doanh thu:</span>
                    <span className="font-mono font-bold text-indigo-300">{totalRevenue.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowNotificationsModal(true)}
                  title="Trung tâm thông báo"
                  className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-slate-200 hover:text-white flex items-center justify-center shrink-0"
                >
                  <Bell className="w-4 h-4 text-emerald-400" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-md animate-pulse">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSelectedBgTheme(currentUser.bgTheme || 'cyber-dark');
                    setCustomBgUrlInput(currentUser.bgCustomUrl || '');
                    setShowThemeModal(true);
                  }}
                  title="Đổi phông nền giao diện tài khoản"
                  className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-300" /> Đổi phông nền
                </button>

                <button
                  onClick={() => setShowQuickCheckOutListModal(true)}
                  title="Lấy xe ra khỏi bãi (Check-out)"
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Car className="w-3.5 h-3.5" /> Lấy xe ra
                </button>

                {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
                  <button
                    onClick={() => handleManualOpenBarrier('Cổng chính')}
                    title="Mở barrier thủ công"
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" /> Mở Barrier
                  </button>
                )}
              </div>
            </>
          )}
        </header>

        {/* Vertical Drawer Sidebar Menu */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex animate-fade-in">
            {/* Backdrop / Overlay */}
            <div 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Vertical Sliding Drawer Container */}
            <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 z-50 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl h-full">
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 border border-white/20 p-2 rounded-xl shadow-sm">
                      <img src="/assets/aistudio/image_6150025b.png" alt="Smart Parking Logo" className="w-8 h-8 object-contain rounded-lg" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-white">Smart Parking</h2>
                      <p className="text-[11px] text-emerald-400 font-semibold">Danh mục chức năng</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Summary Card */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold shrink-0">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${currentUser.role === 'admin' ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40' : currentUser.role === 'staff' ? 'bg-blue-500/30 text-blue-200 border border-blue-500/40' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'}`}>
                        {currentUser.role === 'admin' ? 'ADMIN' : currentUser.role === 'staff' ? 'STAFF' : 'KHÁCH HÀNG'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vertical Navigation Menu List */}
                <nav className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
                    {currentUser.role === 'customer' ? 'Cổng Khách Hàng' : 'Chức năng chính'}
                  </p>
                  
                  {currentUser.role === 'customer' ? (
                    <>
                      <button
                        onClick={() => { setActiveTab('map'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'map' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <LayoutGrid className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Sơ đồ bãi xe & Đặt chỗ</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('my_qr'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'my_qr' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Mã QR xe của tôi</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('tickets'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'tickets' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <History className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Lịch sử gửi xe & Điểm ({myTickets.length})</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('wallet_history'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'wallet_history' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Lịch sử ví điện tử ({walletTransactions.filter(wt => wt.userId === currentUser.uid).length})</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('support'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'support' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Chăm sóc khách hàng</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {currentUser.role !== 'staff' && (
                        <button
                          onClick={() => { setActiveTab('map'); setIsDrawerOpen(false); }}
                          className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'map' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                        >
                          <LayoutGrid className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Sơ đồ nhà xe</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setActiveTab('tickets'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'tickets' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <History className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Lịch sử gửi xe ({tickets.length})</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('pending_approvals'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center justify-between font-bold text-xs transition cursor-pointer ${activeTab === 'pending_approvals' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className={`w-4 h-4 shrink-0 ${totalPendingCount > 0 ? 'text-amber-400 animate-pulse' : 'text-amber-400'}`} />
                          <span>Chờ xác nhận</span>
                        </div>
                        {totalPendingCount > 0 && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {totalPendingCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => { setActiveTab('support'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'support' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Chăm sóc khách hàng</span>
                      </button>

                      <div className="my-3 border-t border-slate-800/80 pt-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Vận hành & Nghiệp vụ</p>
                      </div>

                      <button
                        onClick={() => { setActiveTab('staff_scanner'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'staff_scanner' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Quét QR Nhân viên</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('staff'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'staff' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <Users className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Nghiệp vụ xe</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('audit_logs'); setIsDrawerOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'audit_logs' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Nhật ký Hoạt động ({auditLogs.length})</span>
                      </button>

                      {currentUser.role === 'admin' && (
                        <>
                          <div className="my-3 border-t border-slate-800/80 pt-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Quản trị hệ thống (Admin)</p>
                          </div>

                          <button
                            onClick={() => { setActiveTab('admin_tickets'); setIsDrawerOpen(false); }}
                            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'admin_tickets' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                          >
                            <QrCode className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>Quản lý vé & Mã QR ({tickets.length})</span>
                          </button>

                          <button
                            onClick={() => { setActiveTab('settings'); setIsDrawerOpen(false); }}
                            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'settings' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                          >
                            <Settings className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>Cấu hình ô đỗ</span>
                          </button>

                          <button
                            onClick={() => { setActiveTab('users'); setIsDrawerOpen(false); }}
                            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'users' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                          >
                            <Users className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>Quản lý tài khoản ({usersList.length})</span>
                          </button>

                          <button
                            onClick={() => { setActiveTab('analytics'); setIsDrawerOpen(false); }}
                            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs transition cursor-pointer ${activeTab === 'analytics' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                          >
                            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Thống kê doanh thu</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </nav>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-5 border-t border-slate-800 space-y-2 mt-auto">
                <button
                  onClick={() => {
                    setEditName(currentUser.name);
                    setEditPhone(currentUser.phoneNumber || '');
                    setEditAddress(currentUser.address || '');
                    setEditBirthDate(currentUser.birthDate || '');
                    setEditGender(currentUser.gender || 'Nam');
                    setShowEditProfileModal(true);
                    setIsDrawerOpen(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
                <button
                  onClick={() => { handleLogout(); setIsDrawerOpen(false); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full relative z-10">
        {/* Role-Based Welcome Banner */}
        <div className="mb-6">
          {currentUser.role === 'admin' && (
            <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    👑 Bảng Điều Hành Quản Trị Hệ Thống (Admin Command Center)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Quản lý toàn diện ô đỗ, phân quyền tài khoản nhân viên/khách hàng, cấu hình giá cước và báo cáo doanh thu chi tiết.
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
                  Quyền hạn: Tối cao (Super Admin)
                </span>
              </div>
            </div>
          )}

          {currentUser.role === 'staff' && (
            <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-teal-950/80 border border-blue-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    🛡️ Trạm Nghiệp Vụ Vận Hành Bãi Đỗ (Staff Operational Terminal)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Sử dụng trạm quét QR camera, duyệt giữ chỗ ra vào bãi, kiểm tra quy tắc xe và xử lý thanh toán trực tiếp.
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold">
                  Nhân viên trực bãi
                </span>
              </div>
            </div>
          )}

          {currentUser.role === 'customer' && (
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/80 border border-emerald-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    ⭐ Cổng Đặt Chỗ & Ví Điện Tử Khách Hàng (Customer Portal)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Chọn ô đỗ thời gian thực, quản lý mã QR cá nhân, tích điểm thưởng hạng thành viên {currentUser.membershipTier?.toUpperCase()} và nạp ví tiện lợi.
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                  {currentUser.membershipTier === 'vip' ? '💎 Khách hàng VIP' : '👤 Khách hàng Thường'}
                </span>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'staff_scanner' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur text-white space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Trạm Quét QR & Xác Thực Vé Giữ Chỗ (Staff Scanner)</h3>
                    <p className="text-xs text-slate-400">Quét camera hoặc nhập mã vé QR của khách hàng để duyệt xe vào bãi hoặc thanh toán ra bãi</p>
                  </div>
                </div>
              </div>

              {/* Input QR Code or Ticket ID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">Nhập hoặc quét mã vé (Ticket QR Code ID):</label>
                  <button
                    onClick={() => setShowCameraScanner(!showCameraScanner)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <QrCode className="w-4 h-4" /> {showCameraScanner ? 'Tắt Camera Quét' : '📸 Bật Camera Quét QR'}
                  </button>
                </div>

                {showCameraScanner && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400">Đang bật Camera thiết bị quét QR...</span>
                      <button onClick={() => setShowCameraScanner(false)} className="text-xs text-slate-400 hover:text-white underline">Đóng Camera</button>
                    </div>
                    <div id="reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden border border-slate-800"></div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannerInputCode}
                    onChange={(e) => setScannerInputCode(e.target.value)}
                    placeholder="VD: ticket_1712345678900"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => {
                      const found = tickets.find(t => t.id === scannerInputCode.trim());
                      if (found) {
                        setScannedTicketResult(found);
                        showToast('success', `Đã tìm thấy vé xe ${found.licensePlate}!`);
                      } else {
                        setScannedTicketResult(null);
                        showToast('error', 'Không tìm thấy mã vé trên hệ thống.');
                      }
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Tra cứu vé
                  </button>
                </div>
              </div>

              {/* Quick Select Pending Tickets for Demo/Testing Camera Simulation */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Danh sách vé chờ duyệt:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tickets.filter(t => t.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Không có vé nào đang chờ duyệt.</p>
                  ) : (
                    tickets.filter(t => t.status === 'pending').map(t => (
                      <div key={t.id} onClick={() => { setScannerInputCode(t.id); setScannedTicketResult(t); }} className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-amber-950/20 transition">
                        <div>
                          <p className="text-xs font-bold text-white">Ô {t.slotNumber} - Biển số: <span className="text-emerald-400">{t.licensePlate}</span></p>
                          <p className="text-[10px] text-slate-400">Khách: {t.customerName} • Mã: {t.id}</p>
                        </div>
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold">Chọn quét</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Scanned Ticket Result Details & Action */}
              {scannedTicketResult && (
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-5 rounded-2xl border border-emerald-500/40 space-y-4 shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Kết quả quét vé thành công
                    </h4>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${scannedTicketResult.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : scannedTicketResult.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'}`}>
                      Trạng thái: {scannedTicketResult.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-slate-400">Mã vé:</span> <strong className="text-white font-mono">{scannedTicketResult.id}</strong></div>
                    <div><span className="text-slate-400">Biển số xe:</span> <strong className="text-emerald-400 font-mono text-sm">{scannedTicketResult.licensePlate}</strong></div>
                    <div><span className="text-slate-400">Ô đỗ:</span> <strong className="text-white">{scannedTicketResult.slotNumber}</strong></div>
                    <div><span className="text-slate-400">Khách hàng:</span> <strong className="text-white">{scannedTicketResult.customerName}</strong></div>
                    <div><span className="text-slate-400">Số điện thoại:</span> <strong className="text-white">{scannedTicketResult.phoneNumber}</strong></div>
                    <div><span className="text-slate-400">Thời gian đỗ:</span> <strong className="text-white">{new Date(scannedTicketResult.createdAt || scannedTicketResult.checkInTime).toLocaleString('vi-VN')}</strong></div>
                    <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Trạng thái thanh toán:</span>
                      {scannedTicketResult.paymentStatus === 'paid' ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> ĐÃ THANH TOÁN (Paid)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> CHƯA THANH TOÁN (Unpaid)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    {scannedTicketResult.status === 'pending' && (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={async () => {
                            await handleRejectCheckIn(scannedTicketResult);
                          }}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-2"
                        >
                          <X className="w-4 h-4" /> Từ chối (Reject)
                        </button>
                        <button
                          onClick={async () => {
                            await handleApproveCheckIn(scannedTicketResult);
                            setScannedTicketResult(null);
                            setScannerInputCode('');
                          }}
                          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Xác nhận vào bãi
                        </button>
                      </div>
                    )}
                    {scannedTicketResult.status === 'active' && (
                      <>
                        {scannedTicketResult.paymentStatus === 'paid' ? (
                          <>
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Khách hàng <strong>đã thanh toán</strong> phí gửi xe. Bạn có thể bấm nút <strong>Xác nhận cho ra</strong> bên dưới để hoàn tất lượt gửi và giải phóng ô đỗ.</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <button
                                onClick={async () => {
                                  await handleHoldOrRejectCheckOut(scannedTicketResult);
                                }}
                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                              >
                                <AlertTriangle className="w-4 h-4" /> Từ chối / Giữ xe
                              </button>
                              <button
                                onClick={async () => {
                                  await handleApproveTicketPayment(scannedTicketResult);
                                  setScannedTicketResult(null);
                                  setScannerInputCode('');
                                }}
                                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                              >
                                <Car className="w-4 h-4" /> Xác nhận cho ra & Giải phóng ô đỗ
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 font-medium">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span><strong>CẢNH BÁO:</strong> Khách hàng <strong>chưa thanh toán</strong> phí gửi xe! Không được phép xuất xe khi chưa hoàn tất thanh toán.</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <button
                                onClick={async () => {
                                  await handleHoldOrRejectCheckOut(scannedTicketResult);
                                }}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-2"
                              >
                                <X className="w-4 h-4" /> Từ chối / Giữ xe tại bãi
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTicketForCheckOut(scannedTicketResult);
                                  setShowCheckOutModal(true);
                                }}
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                              >
                                <CreditCard className="w-4 h-4" /> Thu phí & Thanh toán ngay
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my_qr' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur text-white space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Mã QR Gửi Xe Của Tôi (Personal QR Code)</h3>
                    <p className="text-xs text-slate-400">Xuất trình mã QR này cho nhân viên tại bãi đỗ để quét xác nhận khi xe ra bãi</p>
                  </div>
                </div>
              </div>

              {/* List of my tickets */}
              <div className="space-y-4">
                {tickets.filter(t => t.userId === currentUser.uid || t.customerName.toLowerCase() === currentUser.name.toLowerCase() || t.phoneNumber === currentUser.phoneNumber).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                    <Car className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                    <p>Bạn chưa có xe nào đang đỗ trong bãi.</p>
                  </div>
                ) : (
                  tickets.filter(t => t.userId === currentUser.uid || t.customerName.toLowerCase() === currentUser.name.toLowerCase() || t.phoneNumber === currentUser.phoneNumber).map((t) => {
                    const isActive = t.status === 'active';

                    return (
                      <div key={t.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-6 shadow-lg">
                        {/* QR Code Container */}
                        <div className="bg-white p-3 rounded-xl shadow-md shrink-0 flex flex-col items-center justify-center">
                          <QRCodeSVG value={t.id} size={150} level="H" includeMargin={true} />
                          <span className="text-[10px] text-slate-600 font-mono mt-1">{t.id}</span>
                        </div>

                        <div className="flex-1 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              Ô đỗ: <span className="text-emerald-400 font-mono text-base">{t.slotNumber}</span>
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                t.status === 'active' 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : t.status === 'completed' 
                                  ? 'bg-slate-800 text-slate-300' 
                                  : t.status === 'pending' || t.status === 'PENDING'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-300'
                              }`}>
                                {t.status === 'active' ? 'ĐANG ĐỖ (Parked)' : t.status === 'completed' ? 'Đã hoàn thành' : t.status === 'pending' || t.status === 'PENDING' ? 'CHỜ XÁC NHẬN (Pending)' : 'Đã hủy'}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${t.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                                {t.paymentStatus === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                              </span>
                            </div>
                          </div>

                          <p><span className="text-slate-400">Biển số xe:</span> <strong className="text-white font-mono text-sm ml-1">{t.licensePlate}</strong></p>
                          <p><span className="text-slate-400">Loại xe:</span> <strong className="text-white ml-1">{t.vehicleType.toUpperCase()} {t.isVip ? '(VIP)' : ''}</strong></p>
                          <p><span className="text-slate-400">Thời gian bắt đầu đỗ:</span> <strong className="text-white ml-1">{new Date(t.checkInTime).toLocaleString('vi-VN')}</strong></p>

                          {isActive && t.paymentStatus !== 'paid' && (
                            <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl flex items-center justify-between mt-2">
                              <span className="text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-400" /> Chưa thanh toán phí gửi xe
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedTicketForCheckOut(t);
                                  setShowCheckOutModal(true);
                                }}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                              >
                                Thanh toán ngay
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet_history' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-slate-900/95 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-white space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <Wallet className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight">Lịch Sử Giao Dịch Ví Điện Tử</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Theo dõi chi tiết toàn bộ lịch sử nạp tiền, thanh toán phí gửi xe và trạng thái giao dịch ví của bạn</p>
                  </div>
                </div>
                <button
                  onClick={() => { setTopUpTargetUser(currentUser); setShowTopUpModal(true); }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nạp thêm tiền vào ví
                </button>
              </div>

              {/* Transactions List Table Container */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Danh sách giao dịch ví ({walletTransactions.filter(wt => wt.userId === currentUser.uid).length})</span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-xl">
                    <span className="text-xs text-slate-300">Số dư hiện tại:</span>
                    <span className="text-sm text-emerald-400 font-mono font-extrabold">
                      {(currentUser.walletBalance ?? 200000).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                      <tr>
                        <th className="py-4 px-5 min-w-[140px]">Mã giao dịch</th>
                        <th className="py-4 px-5 min-w-[160px]">Loại giao dịch</th>
                        <th className="py-4 px-5 min-w-[140px] text-right">Số tiền</th>
                        <th className="py-4 px-5 min-w-[280px]">Nội dung / Mô tả</th>
                        <th className="py-4 px-5 min-w-[170px]">Thời gian</th>
                        <th className="py-4 px-5 min-w-[130px] text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {walletTransactions.filter(wt => wt.userId === currentUser.uid).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-500 italic text-sm">
                            <Wallet className="w-10 h-10 mx-auto opacity-30 text-slate-400 mb-2" />
                            Bạn chưa có giao dịch ví nào trong hệ thống.
                          </td>
                        </tr>
                      ) : (
                        walletTransactions.filter(wt => wt.userId === currentUser.uid).map((wt) => {
                          const isTopup = wt.type === 'topup';
                          const isApproved = wt.status === 'approved' || !wt.status;
                          const isPending = wt.status === 'pending';

                          return (
                            <tr key={wt.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="py-4 px-5 font-mono font-bold text-slate-300 align-middle">
                                {wt.id}
                              </td>
                              <td className="py-4 px-5 align-middle">
                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-bold tracking-wide shadow-sm ${
                                  isTopup 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                  {isTopup ? '📥 Nạp tiền vào ví' : '💳 Thanh toán phí đỗ'}
                                </span>
                              </td>
                              <td className={`py-4 px-5 font-mono font-bold text-sm text-right align-middle ${isTopup ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isTopup ? '+' : '-'}{wt.amount.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-4 px-5 text-slate-200 align-middle max-w-[280px] whitespace-normal break-words leading-relaxed" title={wt.description}>
                                {wt.description}
                              </td>
                              <td className="py-4 px-5 text-slate-400 font-mono text-[11px] align-middle whitespace-nowrap">
                                {new Date(wt.createdAt).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-4 px-5 text-right align-middle">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  isApproved 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : isPending 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {isApproved ? 'Thành công' : isPending ? 'Chờ duyệt' : 'Từ chối'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && currentUser?.role !== 'staff' && (
          <div className="space-y-6">
            {/* Over 24h Parking Warning Banner for Admin/Staff */}
            {currentUser.role === 'admin' && (() => {
              const over24hTickets = tickets.filter(t => !t.checkOutTime && t.checkInTime && ((Date.now() - new Date(t.checkInTime).getTime()) / (1000 * 3600)) > 24);
              if (over24hTickets.length === 0) return null;
              return (
                <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/90 border border-red-500/50 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                        Cảnh báo: Có {over24hTickets.length} xe đỗ quá 24 giờ trong bãi!
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Các xe quá hạn hiển thị cờ đỏ 🚩 trên sơ đồ để nhân viên dễ dàng kiểm tra.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {over24hTickets.map(t => (
                      <span key={t.id} className="bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                        Ô {t.slotNumber} ({t.licensePlate})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {currentUser.role === 'customer' && (
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Thẻ thành viên: {currentUser.membershipTier === 'vip' ? 'Khách hàng VIP' : 'Khách hàng Thường'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tích lũy 300 điểm thưởng qua mỗi lần gửi xe để tự động nâng hạng VIP và mở khóa ô VIP.</p>
                  </div>
                </div>
                <div className="bg-slate-950/80 px-6 py-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-0.5">Điểm tích lũy hiện tại</span>
                  <span className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 fill-amber-400" /> {Number((currentUser.loyaltyPoints || 0).toFixed(2))} điểm
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => setFilterZone('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'all' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Tất cả khu vực
                </button>
                <button
                  onClick={() => setFilterZone('zone_a')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_a' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu A (Ô tô Thường)
                </button>
                <button
                  onClick={() => setFilterZone('zone_b')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_b' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu B (Ô tô VIP)
                </button>
                <button
                  onClick={() => setFilterZone('zone_c')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_c' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu C (Xe máy)
                </button>
                <button
                  onClick={() => setFilterZone('zone_d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_d' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu D (Xe điện & Sạc)
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="available">Trống (Available)</option>
                  <option value="pending">Chờ duyệt (Pending)</option>
                  <option value="occupied">Đang đỗ (Occupied)</option>
                </select>

                <div className="relative flex-1 md:w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm số ô đỗ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                <span>Trống (Có thể gửi xe)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div>
                <span>Chờ duyệt (Pending)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                <span>Đang đỗ xe (Occupied)</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/30">VIP Zone</span>
                <span>Chỉ dành cho Khách hàng VIP (300+ điểm)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredSlots.map((slot) => {
                const pendingTicket = tickets.find(t => t.status === 'pending' && (t.slotId === slot.id || t.slotNumber === slot.slotNumber));
                const activeTicket = tickets.find(t => (!t.checkOutTime && t.status === 'active') && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
                const isPending = !!pendingTicket;
                const isOccupied = !!activeTicket || slot.status === 'occupied';
                const slotStatus = isPending ? 'pending' : (isOccupied ? 'occupied' : 'available');
                const parkedHours = activeTicket?.checkInTime ? (Date.now() - new Date(activeTicket.checkInTime).getTime()) / (1000 * 3600) : 0;
                const isOver24h = isOccupied && parkedHours > 24;

                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      if (slotStatus === 'available') {
                        setSelectedSlotForCheckIn(slot);
                        setCheckInIsVip(slot.type === 'car_vip' || currentUser.membershipTier === 'vip' || currentUser.role === 'admin');
                        setCheckInCustomerName(currentUser.name || currentUser.email?.split('@')[0] || '');
                        setCheckInPhone(currentUser.phoneNumber || (currentUser.email === 'admin@parking.vn' ? '0901234567' : currentUser.email === 'staff@parking.vn' ? '0909876543' : '0912345678'));
                        setShowCheckInModal(true);
                      } else if (slotStatus === 'pending') {
                        if (currentUser.role === 'admin' || currentUser.role === 'staff') {
                          setActiveTab('staff_scanner');
                          if (pendingTicket) {
                            setScannerInputCode(pendingTicket.id);
                            setScannedTicketResult(pendingTicket);
                          }
                        } else {
                          showToast('error', `Ô ${slot.slotNumber} đang có yêu cầu gửi xe chờ Nhân viên/Admin duyệt.`);
                        }
                      } else if (slotStatus === 'occupied' && activeTicket && (currentUser.role === 'admin' || currentUser.role === 'staff' || activeTicket.customerName === currentUser.name)) {
                        setSelectedTicketForCheckOut(activeTicket);
                        setShowCheckOutModal(true);
                      }
                    }}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-36 ${
                      slotStatus === 'available'
                        ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10' 
                        : slotStatus === 'pending'
                        ? 'bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-500/20'
                        : isOver24h
                        ? 'bg-red-950/60 border-red-500 shadow-xl shadow-red-500/30 animate-pulse'
                        : 'bg-red-950/20 border-red-500/30 hover:border-red-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-bold text-slate-100">{slot.slotNumber}</span>
                        {slot.type === 'car_vip' && (
                          <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-500/30 flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" /> VIP
                          </span>
                        )}
                        {slot.type === 'motorbike' && <Bike className="w-4 h-4 text-blue-400" />}
                        {slot.type === 'electric' && <Zap className="w-4 h-4 text-amber-400" />}
                        {slot.type === 'car_standard' && <Car className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{slot.zoneName}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800">
                      {slotStatus === 'available' && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Trống
                          </span>
                          <span className="text-[10px] text-emerald-300 font-semibold underline">Gửi xe</span>
                        </div>
                      )}
                      {slotStatus === 'pending' && (
                        <div>
                          <div className="mb-1">
                            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-0.5 shadow shadow-amber-500/50 w-fit">
                              ⏳ Chờ duyệt
                            </span>
                          </div>
                          <div className="text-xs font-bold text-amber-300 truncate">
                            {pendingTicket ? pendingTicket.licensePlate : 'Chờ duyệt'}
                          </div>
                          {pendingTicket && pendingTicket.customerName && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {pendingTicket.customerName}
                            </div>
                          )}
                        </div>
                      )}
                      {slotStatus === 'occupied' && (
                        <div>
                          {isOver24h && (
                            <div className="mb-1">
                              <span className="bg-red-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-0.5 shadow shadow-red-500/50 w-fit">
                                🚩 Quá 24h ({parkedHours.toFixed(1)}h)
                              </span>
                            </div>
                          )}
                          <div className="text-xs font-bold text-red-400 truncate">
                            {activeTicket && activeTicket.licensePlate ? activeTicket.licensePlate : 'Đang đỗ'}
                          </div>
                          {activeTicket && activeTicket.customerName && activeTicket.customerName !== 'Đang đỗ' && activeTicket.customerName !== activeTicket.licensePlate && activeTicket.customerName !== 'Khách vãng lai' && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {activeTicket.customerName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-400" /> Lịch sử Gửi xe & Điểm tích lũy
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentUser.role === 'customer' ? 'Hiển thị dữ liệu lịch sử đỗ xe chính chủ của tài khoản bạn.' : 'Tra cứu lịch sử gửi xe toàn hệ thống với bộ lọc.'}
                  </p>
                </div>
                <span className="text-xs text-slate-400">Hiển thị: {
                  (() => {
                    const filtered = myTickets.filter(t => {
                      if (ticketFilterStatus === 'active' && t.status !== 'active' && t.checkOutTime) return false;
                      if (ticketFilterStatus === 'pending_approval' && t.paymentStatus !== 'pending_approval') return false;
                      if (ticketFilterStatus === 'completed' && t.status !== 'completed' && t.paymentStatus !== 'paid') return false;

                      if (ticketFilterDate !== 'all' && t.checkInTime) {
                        const checkInDate = new Date(t.checkInTime);
                        const now = new Date();
                        if (ticketFilterDate === 'today') {
                          if (checkInDate.toDateString() !== now.toDateString()) return false;
                        } else if (ticketFilterDate === 'week') {
                          const diffDays = (now.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24);
                          if (diffDays > 7) return false;
                        } else if (ticketFilterDate === 'month') {
                          if (checkInDate.getMonth() !== now.getMonth() || checkInDate.getFullYear() !== now.getFullYear()) return false;
                        }
                      }

                      if (ticketFilterZone !== 'all') {
                        const slotObj = slots.find(s => s.id === t.slotId || s.slotNumber === t.slotNumber);
                        const zId = slotObj ? slotObj.zoneId : (t.slotNumber?.startsWith('A') ? 'zone_a' : t.slotNumber?.startsWith('B') ? 'zone_b' : t.slotNumber?.startsWith('C') ? 'zone_c' : t.slotNumber?.startsWith('D') ? 'zone_d' : '');
                        if (zId !== ticketFilterZone) return false;
                      }

                      if (ticketSearchQuery.trim()) {
                        const q = ticketSearchQuery.trim().toLowerCase();
                        const matchPlate = t.licensePlate?.toLowerCase().includes(q);
                        const matchName = t.customerName?.toLowerCase().includes(q);
                        const matchPhone = t.phoneNumber?.toLowerCase().includes(q);
                        const matchSlot = t.slotNumber?.toLowerCase().includes(q);
                        if (!matchPlate && !matchName && !matchPhone && !matchSlot) return false;
                      }

                      return true;
                    });
                    return `${filtered.length} / ${myTickets.length}`;
                  })()
                } giao dịch</span>
              </div>

              {/* Filter Controls Bar */}
              <div className="p-4 bg-slate-950/85 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    placeholder="Tìm theo biển số, tên khách hàng, số điện thoại, số ô đỗ..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Zone Filter */}
                  <select
                    value={ticketFilterZone}
                    onChange={(e) => setTicketFilterZone(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="all">🅿️ Tất cả khu vực (Zone)</option>
                    <option value="zone_a">Khu A (Ô tô Thường)</option>
                    <option value="zone_b">Khu B (Ô tô VIP)</option>
                    <option value="zone_c">Khu C (Xe máy)</option>
                    <option value="zone_d">Khu D (Xe điện & Sạc)</option>
                  </select>

                  {/* Date Filter */}
                  <select
                    value={ticketFilterDate}
                    onChange={(e) => setTicketFilterDate(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="all">📅 Tất cả các ngày</option>
                    <option value="today">📅 Hôm nay</option>
                    <option value="week">📅 7 ngày qua</option>
                    <option value="month">📅 Tháng này</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={ticketFilterStatus}
                    onChange={(e) => setTicketFilterStatus(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="all">📌 Tất cả trạng thái</option>
                    <option value="active">🚗 Đang đỗ trong bãi</option>
                    <option value="pending_approval">⏳ Chờ xác nhận thanh toán</option>
                    <option value="completed">✅ Hoàn thành / Đã thanh toán</option>
                  </select>

                  {(ticketFilterDate !== 'all' || ticketFilterStatus !== 'all' || ticketFilterZone !== 'all' || ticketSearchQuery) && (
                    <button
                      onClick={() => {
                        setTicketFilterDate('all');
                        setTicketFilterStatus('all');
                        setTicketFilterZone('all');
                        setTicketSearchQuery('');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Mã vé / Ô đỗ</th>
                      <th className="p-3">Biển số xe</th>
                      <th className="p-3">Loại xe</th>
                      <th className="p-3">Khách hàng</th>
                      <th className="p-3">Thời gian vào</th>
                      <th className="p-3">Thời gian ra (Check-out)</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Phí gửi</th>
                      <th className="p-3">Điểm thưởng</th>
                      {(currentUser.role === 'admin' || currentUser.role === 'staff') && <th className="p-3 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {myTickets.filter(t => {
                      if (ticketFilterStatus === 'active' && t.status !== 'active' && t.checkOutTime) return false;
                      if (ticketFilterStatus === 'pending_approval' && t.paymentStatus !== 'pending_approval') return false;
                      if (ticketFilterStatus === 'completed' && t.status !== 'completed' && t.paymentStatus !== 'paid') return false;

                      if (ticketFilterDate !== 'all' && t.checkInTime) {
                        const checkInDate = new Date(t.checkInTime);
                        const now = new Date();
                        if (ticketFilterDate === 'today') {
                          if (checkInDate.toDateString() !== now.toDateString()) return false;
                        } else if (ticketFilterDate === 'week') {
                          const diffDays = (now.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24);
                          if (diffDays > 7) return false;
                        } else if (ticketFilterDate === 'month') {
                          if (checkInDate.getMonth() !== now.getMonth() || checkInDate.getFullYear() !== now.getFullYear()) return false;
                        }
                      }

                      if (ticketFilterZone !== 'all') {
                        const slotObj = slots.find(s => s.id === t.slotId || s.slotNumber === t.slotNumber);
                        const zId = slotObj ? slotObj.zoneId : (t.slotNumber?.startsWith('A') ? 'zone_a' : t.slotNumber?.startsWith('B') ? 'zone_b' : t.slotNumber?.startsWith('C') ? 'zone_c' : t.slotNumber?.startsWith('D') ? 'zone_d' : '');
                        if (zId !== ticketFilterZone) return false;
                      }

                      if (ticketSearchQuery.trim()) {
                        const q = ticketSearchQuery.trim().toLowerCase();
                        const matchPlate = t.licensePlate?.toLowerCase().includes(q);
                        const matchName = t.customerName?.toLowerCase().includes(q);
                        const matchPhone = t.phoneNumber?.toLowerCase().includes(q);
                        const matchSlot = t.slotNumber?.toLowerCase().includes(q);
                        if (!matchPlate && !matchName && !matchPhone && !matchSlot) return false;
                      }

                      return true;
                    }).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-emerald-400">{t.slotNumber}</td>
                        <td className="p-3 font-bold text-slate-100">{t.licensePlate} {t.isVip && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 rounded ml-1">VIP</span>}</td>
                        <td className="p-3 uppercase">{t.vehicleType}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{t.customerName}</div>
                          <div className="text-[10px] text-slate-400">{t.phoneNumber}</div>
                        </td>
                        <td className="p-3 text-slate-300">{new Date(t.checkInTime).toLocaleString('vi-VN')}</td>
                        <td className="p-3 text-slate-300">
                          {t.checkOutTime 
                            ? new Date(t.checkOutTime).toLocaleString('vi-VN') 
                            : '— (Xe đang trong bãi)'}
                        </td>
                        <td className="p-3">
                          {t.paymentStatus === 'pending_approval' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 animate-spin text-amber-300" /> Chờ xác nhận
                            </span>
                          ) : t.paymentStatus === 'rejected' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 w-fit block">
                              Từ chối
                            </span>
                          ) : t.status === 'completed' || t.paymentStatus === 'paid' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 w-fit block">
                              Hoàn thành
                            </span>
                          ) : t.status === 'pending' || t.status === 'PENDING' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 animate-spin text-amber-300" /> Chờ xác nhận
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-fit block">
                              Đang đỗ
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-indigo-300">{t.fee ? `${t.fee.toLocaleString('vi-VN')} đ` : '—'}</td>
                        <td className="p-3">
                          {t.paymentStatus === 'pending_approval' ? (
                            <span className="text-amber-300/90 text-xs font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                              Chờ duyệt (Chưa cộng +{Number((t.pointsEarned || 0).toFixed(2))}đ)
                            </span>
                          ) : t.status === 'completed' || t.paymentStatus === 'paid' ? (
                            <span className="font-bold text-amber-400">
                              +{Number((t.pointsEarned || 0).toFixed(2))} điểm
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        {(currentUser.role === 'admin' || currentUser.role === 'staff') && !t.checkOutTime && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedTicketForCheckOut(t);
                                setShowCheckOutModal(true);
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/30 transition cursor-pointer"
                            >
                              Trả xe (Check-out)
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {myTickets.filter(t => {
                      if (ticketFilterStatus === 'active' && t.status !== 'active' && t.checkOutTime) return false;
                      if (ticketFilterStatus === 'pending_approval' && t.paymentStatus !== 'pending_approval') return false;
                      if (ticketFilterStatus === 'completed' && t.status !== 'completed' && t.paymentStatus !== 'paid') return false;

                      if (ticketFilterDate !== 'all' && t.checkInTime) {
                        const checkInDate = new Date(t.checkInTime);
                        const now = new Date();
                        if (ticketFilterDate === 'today') {
                          if (checkInDate.toDateString() !== now.toDateString()) return false;
                        } else if (ticketFilterDate === 'week') {
                          const diffDays = (now.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24);
                          if (diffDays > 7) return false;
                        } else if (ticketFilterDate === 'month') {
                          if (checkInDate.getMonth() !== now.getMonth() || checkInDate.getFullYear() !== now.getFullYear()) return false;
                        }
                      }

                      if (ticketSearchQuery.trim()) {
                        const q = ticketSearchQuery.trim().toLowerCase();
                        const matchPlate = t.licensePlate?.toLowerCase().includes(q);
                        const matchName = t.customerName?.toLowerCase().includes(q);
                        const matchPhone = t.phoneNumber?.toLowerCase().includes(q);
                        const matchSlot = t.slotNumber?.toLowerCase().includes(q);
                        if (!matchPlate && !matchName && !matchPhone && !matchSlot) return false;
                      }

                      return true;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                          Không tìm thấy lịch sử gửi xe nào của riêng tài khoản bạn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-400" /> Nghiệp vụ Gửi xe vào bãi
              </h3>
              <p className="text-xs text-slate-400">Chọn ô đỗ trống trên sơ đồ hoặc bấm vào đây để tiến hành gửi xe.</p>
              
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ô đỗ trống có sẵn:</span>
                  <span className="text-xs font-bold text-emerald-400">{availableSlotsCount} ô trống</span>
                </div>
                <button
                  onClick={() => {
                    const availSlot = slots.find(s => s.status === 'available');
                    if (availSlot) {
                      setSelectedSlotForCheckIn(availSlot);
                      setShowCheckInModal(true);
                    } else {
                      showToast('error', 'Bãi đỗ đã hết chỗ trống! Hãy bấm Reset ô trống.');
                    }
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  Gửi xe vào ô trống đầu tiên
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-red-400" /> Nghiệp vụ Trả xe ra (Check-out)
              </h3>
              <p className="text-xs text-slate-400">Chọn xe đang đỗ để tính tiền, tích điểm và giải phóng ô đỗ.</p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tickets.filter(t => t.status === 'active').length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Không có xe nào đang đỗ trong bãi.</p>
                ) : (
                  tickets.filter(t => t.status === 'active').map(t => (
                    <div key={t.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-400 mr-2">[{t.slotNumber}]</span>
                        <span className="font-bold text-slate-100">{t.licensePlate}</span>
                        <span className="text-slate-400 ml-2">({t.customerName})</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTicketForCheckOut(t);
                          setShowCheckOutModal(true);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg font-semibold border border-red-500/30 transition"
                      >
                        Trả xe ngay
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            {/* Tariff & Pricing Configuration Section */}
            <div className="bg-slate-900 border border-purple-500/30 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 text-white">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> Tự thiết lập & Tùy chỉnh Giá cước & Biểu phí Bãi đỗ
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Cấu hình giá cước theo loại xe (ô tô điện, ô tô xăng, xe máy), phụ phí theo khung giờ (giờ cao điểm, ban đêm) và chính sách vé tháng/vé lượt.
                  </p>
                </div>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-3 py-1 rounded-full">
                  Admin Tariff Config
                </span>
              </div>

              <form onSubmit={handleSaveTariff} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Giá xe máy (VNĐ / ca 7h)</label>
                    <input
                      type="number"
                      value={tariffSettings.motorbikeRate}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, motorbikeRate: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Giá ô tô thường / Xăng (VNĐ / ca 7h)</label>
                    <input
                      type="number"
                      value={tariffSettings.carStandardRate}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, carStandardRate: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Giá ô tô VIP (VNĐ / ca 7h)</label>
                    <input
                      type="number"
                      value={tariffSettings.carVipRate}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, carVipRate: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Giá xe điện EV & Sạc (VNĐ / ca 7h)</label>
                    <input
                      type="number"
                      value={tariffSettings.electricRate}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, electricRate: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Phụ phí giờ cao điểm (%) (7h-9h, 17h-19h)</label>
                    <input
                      type="number"
                      value={tariffSettings.peakHourSurchargePercent}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, peakHourSurchargePercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Phụ phí ban đêm (%) (22h - 6h sáng)</label>
                    <input
                      type="number"
                      value={tariffSettings.nightHourSurchargePercent}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, nightHourSurchargePercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Vé tháng xe máy (VNĐ / tháng)</label>
                    <input
                      type="number"
                      value={tariffSettings.monthlyBikePass}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, monthlyBikePass: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Vé tháng ô tô (VNĐ / tháng)</label>
                    <input
                      type="number"
                      value={tariffSettings.monthlyCarPass}
                      onChange={(e) => setTariffSettings({ ...tariffSettings, monthlyCarPass: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end">
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Lưu Cấu Hình Giá Cước & Biểu Phí
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" /> Cấu hình Sơ đồ & Ô đỗ bãi xe
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Quản lý các ô đỗ, thêm ô mới hoặc cấu hình khu vực hệ thống.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleResetInactiveSlots}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" /> Reset ô không hoạt động
                  </button>
                  <button
                    onClick={handleResetSlots}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" /> Reset toàn bộ ô trống
                  </button>
                  <button
                    onClick={handleAddSlot}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-purple-500/20"
                  >
                    <Plus className="w-4 h-4" /> Thêm ô đỗ mới
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Khu A & B (Ô tô)</h4>
                  <p className="text-xs text-slate-400 mb-3">Chỉ dành riêng cho các loại xe ô tô (Standard & VIP).</p>
                  <div className="text-2xl font-bold">{slots.filter(s => s.type.includes('car')).length} ô đỗ</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Khu C (Xe máy)</h4>
                  <p className="text-xs text-slate-400 mb-3">Dành cho xe gắn máy, xe tay ga.</p>
                  <div className="text-2xl font-bold">{slots.filter(s => s.type === 'motorbike').length} ô đỗ</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Khu D (Xe điện & Sạc)</h4>
                  <p className="text-xs text-slate-400 mb-3">Trang bị trụ sạc điện thông minh.</p>
                  <div className="text-2xl font-bold">{slots.filter(s => s.type === 'electric').length} ô đỗ</div>
                </div>
              </div>

              {/* Slot Management Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mt-6">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-emerald-400" /> Quản lý & Chỉnh sửa chi tiết các ô đỗ ({slots.length})
                  </h4>
                  <span className="text-xs text-slate-400">Bấm "Sửa" để thay đổi loại ô (VIP, Thường, Xe máy, Xe điện) hoặc số ô</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3">Số ô</th>
                        <th className="p-3">Khu vực (Zone)</th>
                        <th className="p-3">Loại ô</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {slots.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true })).map((slot) => {
                        const pendingTicket = tickets.find(t => t.status === 'pending' && (t.slotId === slot.id || t.slotNumber === slot.slotNumber));
                        const activeTicket = tickets.find(t => (!t.checkOutTime) && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
                        const isPending = !!pendingTicket;
                        const isOccupied = !!activeTicket || slot.status === 'occupied';
                        const slotStatus = isPending ? 'pending' : (isOccupied ? 'occupied' : 'available');
                        return (
                          <tr key={slot.id} className="hover:bg-slate-900/40 transition">
                            <td className="p-3 font-bold text-emerald-400">{slot.slotNumber}</td>
                            <td className="p-3 text-slate-300">{slot.zoneName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${slot.type === 'car_vip' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : slot.type === 'motorbike' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : slot.type === 'electric' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'}`}>
                                {slot.type === 'car_vip' ? 'Ô tô VIP' : slot.type === 'motorbike' ? 'Xe máy' : slot.type === 'electric' ? 'Xe điện & Sạc' : 'Ô tô Thường'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${slotStatus === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : slotStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                {slotStatus === 'available' ? 'Trống' : slotStatus === 'pending' ? 'Chờ duyệt' : 'Đang đỗ'}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditSlot(slot)}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-semibold border border-blue-500/30 transition"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id, slot.slotNumber)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/30 transition"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'admin_tickets' && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              {/* Top Banner & Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
                    <QrCode className="w-6 h-6 text-purple-400" /> Quản lý Vé & Mã QR Toàn Hệ Thống ({tickets.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tra cứu toàn bộ vé gửi xe do Admin tạo hoặc khách đặt, theo dõi trạng thái và kiểm tra/xuất mã QR xác thực trực tiếp.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const availSlot = slots.find(s => s.status === 'available');
                    if (availSlot) {
                      setSelectedSlotForCheckIn(availSlot);
                      setShowCheckInModal(true);
                    } else {
                      showToast('error', 'Bãi đỗ xe hiện đã hết ô trống!');
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tạo vé gửi xe mới
                </button>
              </div>

              {/* Status Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tổng vé hệ thống</span>
                  <p className="text-2xl font-extrabold text-white">{tickets.length}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Đang đỗ trong bãi</span>
                  <p className="text-2xl font-extrabold text-emerald-400">{tickets.filter(t => t.status === 'active' || !t.checkOutTime).length}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">Chờ xác nhận / TT</span>
                  <p className="text-2xl font-extrabold text-amber-400">{tickets.filter(t => t.paymentStatus === 'pending_approval').length}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30">
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">Đã hoàn thành</span>
                  <p className="text-2xl font-extrabold text-indigo-300">{tickets.filter(t => t.status === 'completed' || t.checkOutTime).length}</p>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    placeholder="Tìm theo Mã vé, Biển số xe, Tên khách hàng, Ô đỗ..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={ticketFilterStatus}
                    onChange={(e) => setTicketFilterStatus(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="all">📌 Tất cả trạng thái vé</option>
                    <option value="active">🚗 Đang đỗ trong bãi</option>
                    <option value="pending_approval">⏳ Chờ xác nhận thanh toán</option>
                    <option value="completed">✅ Đã hoàn thành / Check-out</option>
                  </select>

                  {(ticketFilterStatus !== 'all' || ticketSearchQuery) && (
                    <button
                      onClick={() => {
                        setTicketFilterStatus('all');
                        setTicketSearchQuery('');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>

              {/* Tickets & QR Data Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-white">
                    <FileSpreadsheet className="w-4 h-4 text-purple-400" /> Bảng danh sách mã vé & mã QR xác thực
                  </h4>
                  <span className="text-xs text-slate-400">Bấm nút [Xem QR] để mở popup mã QR chi tiết</span>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Mã vé (Ticket ID)</th>
                        <th className="p-3.5 whitespace-nowrap">Biển số xe</th>
                        <th className="p-3.5 whitespace-nowrap">Loại xe</th>
                        <th className="p-3.5 whitespace-nowrap">Ô đỗ</th>
                        <th className="p-3.5 whitespace-nowrap">Người gửi / Khách hàng</th>
                        <th className="p-3.5 whitespace-nowrap">Trạng thái vé</th>
                        <th className="p-3.5 whitespace-nowrap">Thanh toán</th>
                        <th className="p-3.5 whitespace-nowrap">Thời gian tạo</th>
                        <th className="p-3.5 whitespace-nowrap text-right">Mã QR & Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tickets.filter(t => {
                        if (ticketFilterStatus === 'active' && t.status !== 'active' && t.checkOutTime) return false;
                        if (ticketFilterStatus === 'pending_approval' && t.paymentStatus !== 'pending_approval') return false;
                        if (ticketFilterStatus === 'completed' && t.status !== 'completed' && t.paymentStatus !== 'paid' && !t.checkOutTime) return false;

                        if (ticketSearchQuery.trim()) {
                          const q = ticketSearchQuery.trim().toLowerCase();
                          const matchId = t.id?.toLowerCase().includes(q);
                          const matchPlate = t.licensePlate?.toLowerCase().includes(q);
                          const matchName = t.customerName?.toLowerCase().includes(q);
                          const matchPhone = t.phoneNumber?.toLowerCase().includes(q);
                          const matchSlot = t.slotNumber?.toLowerCase().includes(q);
                          if (!matchId && !matchPlate && !matchName && !matchPhone && !matchSlot) return false;
                        }
                        return true;
                      }).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-400">{t.id}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                              {t.licensePlate}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="text-slate-200 font-semibold uppercase">
                              {t.vehicleType} {t.isVip ? '(VIP)' : ''}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap font-bold text-amber-400">{t.slotNumber}</td>
                          <td className="p-3.5 whitespace-nowrap text-slate-200 font-medium">
                            {t.customerName || 'Khách vãng lai'}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {t.status === 'completed' || t.checkOutTime ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Hoàn tất
                              </span>
                            ) : t.paymentStatus === 'pending_approval' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Chờ xác nhận
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Đang đỗ
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${t.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                              {t.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(t.checkInTime).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedTicketForAdminQR(t);
                                  setShowAdminQrModal(true);
                                }}
                                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                              >
                                <QrCode className="w-3.5 h-3.5 text-purple-400" /> Xem QR
                              </button>
                              {!t.checkOutTime && (
                                <button
                                  onClick={() => {
                                    setSelectedTicketForCheckOut(t);
                                    setShowCheckOutModal(true);
                                  }}
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer"
                                >
                                  Check-out
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tickets.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                            Chưa có vé gửi xe nào trong hệ thống.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" /> Quản lý Hồ sơ Nhân viên & Khách hàng ({usersList.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Admin có quyền thêm mới, chỉnh sửa thông tin, phân quyền hoặc xóa tài khoản nhân viên và khách hàng.</p>
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Thêm tài khoản
                </button>
              </div>

              {/* User Profiles Management Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Danh sách toàn bộ tài khoản
                  </h4>
                  <span className="text-xs text-slate-400">Cập nhật theo thời gian thực từ Firestore</span>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Vai trò</th>
                        <th className="p-3">Thành viên / Điểm</th>
                        <th className="p-3">Ví tài khoản</th>
                        <th className="p-3">Số điện thoại</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {usersList.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-800/50 hover:shadow-md transition">
                          <td className="p-3 font-bold text-white">
                            {u.name || u.email?.split('@')[0] || 'Tài khoản người dùng'}
                          </td>
                          <td className="p-3 text-slate-200 font-mono">
                            {u.email || 'user@parking.vn'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : u.role === 'staff'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {u.role ? u.role.toUpperCase() : 'CUSTOMER'}
                            </span>
                          </td>
                          <td className="p-3">
                            {(!u.role || u.role === 'customer') ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.membershipTier === 'vip' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                                  {u.membershipTier === 'vip' ? 'VIP' : 'Thường'}
                                </span>
                                <span className="text-amber-400 font-bold">{Number((u.loyaltyPoints || 0).toFixed(2))} điểm</span>
                              </div>
                            ) : u.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Ban Quản Trị
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Nhân Viên Bãi
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400">
                                {(u.walletBalance ?? 200000).toLocaleString('vi-VN')} đ
                              </span>
                              <button
                                onClick={() => { setTopUpTargetUser(u); setShowTopUpModal(true); }}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                + Nạp ví
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-slate-200 font-mono">
                            {u.phoneNumber || (u.email === 'admin@parking.vn' ? '0901234567' : u.email === 'staff@parking.vn' ? '0909876543' : '0988776655')}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-semibold border border-blue-500/30 transition cursor-pointer"
                            >
                              Sửa
                            </button>
                            {u.uid !== currentUser.uid && (
                              <button
                                onClick={() => setUserToDelete({ uid: u.uid, name: u.name || u.email, email: u.email })}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/30 transition cursor-pointer"
                              >
                                Xóa
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              {/* Header & Period Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Thống kê & Báo cáo Doanh thu Bãi xe
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Báo cáo tổng hợp doanh thu real-time, phân tích theo loại phương tiện, khu vực và lịch sử giao dịch.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setReportPeriod('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'all' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setReportPeriod('today')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'today' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      Hôm nay
                    </button>
                    <button
                      onClick={() => setReportPeriod('week')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'week' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      7 ngày qua
                    </button>
                    <button
                      onClick={() => setReportPeriod('month')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'month' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      Tháng này
                    </button>
                  </div>

                  <button
                    onClick={() => showToast('success', 'Đã xuất file báo cáo doanh thu CSV/Excel thành công!')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Xuất Excel / CSV
                  </button>
                </div>
              </div>

              {/* KPI Summary & Charts */}
              {(() => {
                const now = new Date();
                const filteredTickets = tickets.filter(t => {
                  if (t.status !== 'completed' && !t.checkOutTime) return false;
                  if (!t.checkOutTime) return false;
                  const checkOutDate = new Date(t.checkOutTime);
                  if (reportPeriod === 'today') {
                    return checkOutDate.toDateString() === now.toDateString();
                  }
                  if (reportPeriod === 'week') {
                    const diffDays = (now.getTime() - checkOutDate.getTime()) / (1000 * 3600 * 24);
                    return diffDays <= 7;
                  }
                  if (reportPeriod === 'month') {
                    return checkOutDate.getMonth() === now.getMonth() && checkOutDate.getFullYear() === now.getFullYear();
                  }
                  return true;
                });

                const periodRevenue = filteredTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const periodCount = filteredTickets.length;
                const periodAvg = periodCount > 0 ? Math.round(periodRevenue / periodCount) : 0;
                const activeCount = tickets.filter(t => !t.checkOutTime).length;

                // Payment Method Breakdown
                const walletRev = filteredTickets.filter(t => t.paymentMethod === 'wallet').reduce((sum, t) => sum + (t.fee || 0), 0);
                const transferRev = filteredTickets.filter(t => t.paymentMethod === 'transfer').reduce((sum, t) => sum + (t.fee || 0), 0);
                const cashRev = filteredTickets.filter(t => t.paymentMethod === 'cash' || !t.paymentMethod).reduce((sum, t) => sum + (t.fee || 0), 0);

                // Vehicle Type Breakdown
                const carTickets = filteredTickets.filter(t => t.vehicleType === 'car' || t.vehicleType === 'suv' || t.vehicleType === 'sedan');
                const carRevenue = carTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const carCount = carTickets.length;

                const bikeTickets = filteredTickets.filter(t => t.vehicleType === 'motorbike');
                const bikeRevenue = bikeTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const bikeCount = bikeTickets.length;

                const evTickets = filteredTickets.filter(t => t.vehicleType === 'electric');
                const evRevenue = evTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const evCount = evTickets.length;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Doanh thu kỳ chọn</span>
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-emerald-400">{periodRevenue.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-slate-400 mt-1">Từ {periodCount} lượt xe hoàn tất check-out</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Thanh toán qua Ví</span>
                          <Wallet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-white">{walletRev.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-emerald-400 mt-1">Trừ trực tiếp số dư ví tài khoản</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Chuyển khoản VietQR</span>
                          <QrCode className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-indigo-300">{transferRev.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-indigo-400 mt-1">Quét mã QR Ngân hàng MB Bank</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Tiền mặt</span>
                          <DollarSign className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-amber-400">{cashRev.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-slate-400 mt-1">Thu tiền mặt trực tiếp</p>
                      </div>
                    </div>

                    {/* Breakdown Progress Bars & Recent Transactions Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* By Vehicle Type */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                        <h4 className="text-sm font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-emerald-400" /> Phân tích Doanh thu theo Loại xe
                          </span>
                          <span className="text-xs text-slate-400 font-normal">Tỷ trọng %</span>
                        </h4>

                        <div className="space-y-3.5 text-xs">
                          <div>
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <Car className="w-3.5 h-3.5 text-blue-400" /> Ô tô (Car / SUV / Sedan)
                              </span>
                              <span className="text-emerald-400">{carRevenue.toLocaleString('vi-VN')} đ ({carCount} lượt)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${periodRevenue > 0 ? Math.round((carRevenue / periodRevenue) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <Bike className="w-3.5 h-3.5 text-amber-400" /> Xe máy (Motorbike)
                              </span>
                              <span className="text-emerald-400">{bikeRevenue.toLocaleString('vi-VN')} đ ({bikeCount} lượt)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-amber-500 h-2 rounded-full transition-all"
                                style={{ width: `${periodRevenue > 0 ? Math.round((bikeRevenue / periodRevenue) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Xe điện & Sạc (Electric EV)
                              </span>
                              <span className="text-emerald-400">{evRevenue.toLocaleString('vi-VN')} đ ({evCount} lượt)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${periodRevenue > 0 ? Math.round((evRevenue / periodRevenue) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Ledger Table Summary */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                        <h4 className="text-sm font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-400" /> Giao dịch Doanh thu Mới nhất
                          </span>
                          <span className="text-xs text-indigo-400">{filteredTickets.length} giao dịch</span>
                        </h4>

                        <div className="overflow-x-auto max-h-[240px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider sticky top-0">
                              <tr>
                                <th className="p-2">Thời gian ngày giờ</th>
                                <th className="p-2">Biển số</th>
                                <th className="p-2">Ô đỗ</th>
                                <th className="p-2">Phương thức</th>
                                <th className="p-2 text-right">Phí thu</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {filteredTickets.slice(0, 6).map((t) => (
                                <tr key={t.id} className="hover:bg-slate-900/40">
                                  <td className="p-2 font-mono text-slate-300">{t.checkOutTime ? new Date(t.checkOutTime).toLocaleString('vi-VN') : '—'}</td>
                                  <td className="p-2 font-mono font-bold text-white">{t.licensePlate}</td>
                                  <td className="p-2 text-slate-300">{t.slotNumber}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.paymentMethod === 'wallet'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : t.paymentMethod === 'transfer'
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {t.paymentMethod === 'wallet' ? 'Ví tài khoản' : t.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-bold text-emerald-400">{(t.fee || 0).toLocaleString('vi-VN')} đ</td>
                                </tr>
                              ))}
                              {filteredTickets.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">Chưa có giao dịch doanh thu trong kỳ này.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'pending_approvals' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Mục Chờ Xác Nhận Thanh Toán & Nạp Ví
                    <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {totalPendingCount} yêu cầu
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Đối soát số dư tài khoản ngân hàng MB Bank (<strong className="text-indigo-300 font-mono">7920141546131</strong> - <strong className="text-indigo-300">NGUYEN HUU PHUOC</strong>) trước khi duyệt.
                  </p>
                </div>
              </div>
              <button
                onClick={() => showToast('success', 'Đã làm mới danh sách chờ xác nhận!')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer shrink-0"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Làm mới
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  1. Yêu cầu Nạp tiền Ví chờ xác nhận ({pendingWalletTransList.length})
                </h3>
                <span className="text-xs text-slate-400">Khách hàng đã chuyển khoản VietQR nạp ví</span>
              </div>

              {pendingWalletTransList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/50 rounded-xl border border-slate-800">
                  <CheckCircle className="w-8 h-8 text-indigo-500/50 mx-auto mb-2" />
                  Không có yêu cầu nạp tiền ví nào đang chờ duyệt.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingWalletTransList.map(tx => (
                    <div key={tx.id} className="bg-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-3 relative hover:border-indigo-500/60 transition">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white">{tx.userName}</span>
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" /> Chờ nạp ví
                        </span>
                      </div>
                      <div className="text-xs space-y-1 text-slate-300">
                        <div className="flex justify-between"><span className="text-slate-400">Nội dung:</span><span className="text-white">{tx.description}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Thời gian:</span><span className="font-mono text-slate-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <span className="text-slate-400 font-medium">Số tiền nạp:</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-lg">+{tx.amount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                      {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'wallet_transactions', tx.id), { status: 'approved' });
                                const targetUserDoc = usersList.find(u => u.uid === tx.userId);
                                const newBal = (targetUserDoc?.walletBalance ?? 200000) + tx.amount;
                                await updateDoc(doc(db, 'users', tx.userId), { walletBalance: newBal });
                                await logAudit('Duyệt Nạp Ví', `${currentUser?.name} đã duyệt nạp ${tx.amount.toLocaleString('vi-VN')}đ cho ${tx.userName}`);
                                showToast('success', `Đã duyệt nạp ${tx.amount.toLocaleString('vi-VN')} đ vào ví cho ${tx.userName}!`);
                              } catch (e) {
                                showToast('error', 'Lỗi khi duyệt nạp ví.');
                              }
                            }}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" /> Duyệt nạp ví (+{tx.amount.toLocaleString('vi-VN')}đ)
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  2. Yêu cầu Hoàn tiền Ví chờ xác nhận ({walletTransactions.filter(wt => wt.type === 'refund' && wt.status === 'pending').length})
                </h3>
                <span className="text-xs text-slate-400">Yêu cầu hoàn tiền số dư ví của khách hàng</span>
              </div>

              {walletTransactions.filter(wt => wt.type === 'refund' && wt.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/50 rounded-xl border border-slate-800">
                  <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  Không có yêu cầu hoàn tiền nào đang chờ duyệt.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {walletTransactions.filter(wt => wt.type === 'refund' && wt.status === 'pending').map(tx => (
                    <div key={tx.id} className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3 relative hover:border-emerald-500/60 transition">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white">{tx.userName}</span>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" /> Chờ hoàn tiền
                        </span>
                      </div>
                      <div className="text-xs space-y-1 text-slate-300">
                        <div className="flex justify-between"><span className="text-slate-400">Nội dung:</span><span className="text-white">{tx.description}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Thời gian:</span><span className="font-mono text-slate-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <span className="text-slate-400 font-medium">Số tiền hoàn:</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-lg">+{tx.amount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                      {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleApproveRefund(tx)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" /> Duyệt hoàn tiền (+{tx.amount.toLocaleString('vi-VN')}đ)
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Headphones className="w-5 h-5 text-emerald-400" /> Trợ giúp & Chăm sóc khách hàng (CSKH)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Trò chuyện trực tuyến với quản trị viên/nhân viên, gửi khiếu nại hoặc đóng góp đánh giá dịch vụ bãi đỗ xe.
                  </p>
                </div>

                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
                  <button
                    onClick={() => setSupportSubTab('chat')}
                    className={`px-4 py-2 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${supportSubTab === 'chat' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <MessageSquare className="w-4 h-4" /> Trò chuyện trực tuyến
                  </button>
                  <button
                    onClick={() => setSupportSubTab('complaints')}
                    className={`px-4 py-2 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${supportSubTab === 'complaints' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <ShieldAlert className="w-4 h-4" /> Gửi khiếu nại ({supportComplaints.length})
                  </button>
                  <button
                    onClick={() => setSupportSubTab('reviews')}
                    className={`px-4 py-2 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${supportSubTab === 'reviews' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Star className="w-4 h-4" /> Đánh giá dịch vụ ({supportReviews.length})
                  </button>
                </div>
              </div>

              {/* SubTab 1: Live Chat */}
              {supportSubTab === 'chat' && (
                currentUser.role === 'customer' ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                      <MessageSquare className="w-4 h-4" /> Phòng Chat CSKH (Hỗ trợ 24/7 từ Admin & Staff)
                    </h4>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-80 overflow-y-auto space-y-3">
                      {supportMessages.filter(m => m.userId === currentUser?.uid).length === 0 ? (
                        <div className="text-center py-16 text-slate-500 text-xs italic">
                          Chưa có tin nhắn nào. Hãy gửi tin nhắn để bắt đầu trò chuyện với nhân viên hỗ trợ!
                        </div>
                      ) : (
                        supportMessages.filter(m => m.userId === currentUser?.uid).map(msg => {
                          const isMe = msg.userRole === 'customer';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                                <span className="font-bold text-slate-300">{msg.userName}</span>
                                <span className={`px-1.5 py-0.2 rounded font-semibold ${msg.userRole === 'admin' ? 'bg-purple-500/20 text-purple-300' : msg.userRole === 'staff' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {msg.userRole.toUpperCase()}
                                </span>
                                <span>• {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className={`p-3 rounded-2xl text-xs max-w-lg shadow ${isMe ? 'bg-emerald-600 text-slate-950 font-medium rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'}`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handleSendSupportMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        placeholder="Nhập nội dung cần hỗ trợ hoặc hỏi đáp..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                      >
                        <Send className="w-4 h-4" /> Gửi
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Admin / Staff Messenger-style 2-column Chat UI */
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-3 h-[520px]">
                    {/* Left Column: Customer List */}
                    <div className="border-r border-slate-800 flex flex-col bg-slate-950/80">
                      <div className="p-3.5 border-b border-slate-800">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                          <Users className="w-4 h-4 text-emerald-400" /> Danh sách khách hàng ({usersList.filter(u => u.role === 'customer').length})
                        </h4>
                      </div>
                      <div className="overflow-y-auto flex-1 divide-y divide-slate-900">
                        {usersList.filter(u => u.role === 'customer').length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-xs italic">Chưa có khách hàng nào.</div>
                        ) : (
                          usersList.filter(u => u.role === 'customer').map(cust => {
                            const custMsgs = supportMessages.filter(m => m.userId === cust.uid);
                            const lastMsg = custMsgs[custMsgs.length - 1];
                            const isSelected = selectedChatUserId === cust.uid;
                            return (
                              <div
                                key={cust.uid}
                                onClick={() => setSelectedChatUserId(cust.uid)}
                                className={`p-3.5 cursor-pointer transition flex items-start gap-3 hover:bg-slate-900/60 ${isSelected ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : ''}`}
                              >
                                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs shrink-0">
                                  {(cust.name || cust.email || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-white text-xs truncate">{cust.name || cust.email.split('@')[0]}</span>
                                    {lastMsg && <span className="text-[10px] text-slate-500 font-mono">{new Date(lastMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate">{lastMsg ? lastMsg.text : 'Nhấn để trò chuyện...'}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Right Column: Active Conversation */}
                    <div className="md:col-span-2 flex flex-col bg-slate-900/50">
                      {selectedChatUserId ? (
                        (() => {
                          const activeCust = usersList.find(u => u.uid === selectedChatUserId);
                          const activeMsgs = supportMessages.filter(m => m.userId === selectedChatUserId);
                          return (
                            <>
                              {/* Chat Header */}
                              <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs">
                                    {(activeCust?.name || 'C').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-white">{activeCust?.name || activeCust?.email || 'Khách hàng'}</h5>
                                    <p className="text-[10px] text-slate-400">{activeCust?.email} • {activeCust?.phoneNumber || 'Chưa có SĐT'}</p>
                                  </div>
                                </div>
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Đang kết nối Zalo/Messenger
                                </span>
                              </div>

                              {/* Messages Body */}
                              <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[360px]">
                                {activeMsgs.length === 0 ? (
                                  <div className="text-center py-20 text-slate-500 text-xs italic">
                                    Chưa có tin nhắn với khách hàng này. Hãy bắt đầu cuộc trò chuyện!
                                  </div>
                                ) : (
                                  activeMsgs.map(msg => {
                                    const isStaffOrAdmin = msg.userRole === 'admin' || msg.userRole === 'staff';
                                    return (
                                      <div key={msg.id} className={`flex flex-col ${isStaffOrAdmin ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                                          <span className="font-bold text-slate-300">{msg.userName}</span>
                                          <span className={`px-1.5 py-0.2 rounded font-semibold ${msg.userRole === 'admin' ? 'bg-purple-500/20 text-purple-300' : msg.userRole === 'staff' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                            {msg.userRole.toUpperCase()}
                                          </span>
                                          <span>• {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`p-3 rounded-2xl text-xs max-w-md shadow ${isStaffOrAdmin ? 'bg-emerald-600 text-slate-950 font-medium rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'}`}>
                                          {msg.text}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Message Input */}
                              <form onSubmit={handleSendSupportMessage} className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
                                <input
                                  type="text"
                                  value={chatInputText}
                                  onChange={(e) => setChatInputText(e.target.value)}
                                  placeholder={`Nhập tin nhắn gửi ${activeCust?.name || 'khách hàng'}...`}
                                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                                />
                                <button
                                  type="submit"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1 transition shadow cursor-pointer"
                                >
                                  <Send className="w-4 h-4" /> Gửi
                                </button>
                              </form>
                            </>
                          );
                        })()
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic p-6">
                          Vui lòng chọn một khách hàng từ danh sách bên trái để bắt đầu nhắn tin.
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* SubTab 2: Complaints */}
              {supportSubTab === 'complaints' && (
                <div className="space-y-6">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-amber-400">
                      <ShieldAlert className="w-4 h-4" /> Gửi Đơn Khiếu Nại / Báo cáo sự cố đến Admin
                    </h4>
                    <form onSubmit={handleSendComplaint} className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Tiêu đề khiếu nại *</label>
                          <input
                            type="text"
                            required
                            value={complaintTitle}
                            onChange={(e) => setComplaintTitle(e.target.value)}
                            placeholder="Ví dụ: Thắc mắc về phí gửi xe ô tô"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Danh mục khiếu nại *</label>
                          <select
                            value={complaintCategory}
                            onChange={(e) => setComplaintCategory(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="Phí gửi xe">Phí gửi xe / Thanh toán</option>
                            <option value="Thái độ nhân viên">Thái độ nhân viên bãi đỗ</option>
                            <option value="Sự cố xe / Ô đỗ">Sự cố ô đỗ / Thẻ xe</option>
                            <option value="Vấn đề khác">Vấn đề khác</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Chi tiết nội dung khiếu nại *</label>
                        <textarea
                          rows={3}
                          required
                          value={complaintDesc}
                          onChange={(e) => setComplaintDesc(e.target.value)}
                          placeholder="Mô tả chi tiết vấn đề để Admin hỗ trợ giải quyết nhanh nhất..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                      >
                        <Send className="w-4 h-4" /> Gửi đơn khiếu nại
                      </button>
                    </form>
                  </div>

                  {/* Complaints List */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center justify-between">
                      <span>Danh sách Khiếu nại đã gửi ({supportComplaints.length})</span>
                      <span className="text-xs text-slate-400">Admin có quyền kiểm duyệt và xử lý</span>
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {supportComplaints.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs italic">Chưa có đơn khiếu nại nào được gửi.</div>
                      ) : (
                        supportComplaints.map(comp => (
                          <div key={comp.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{comp.title}</span>
                                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">{comp.category}</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${comp.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                {comp.status === 'resolved' ? 'Đã giải quyết' : 'Đang chờ xử lý'}
                              </span>
                            </div>
                            <p className="text-slate-300">{comp.description}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400 flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>Người gửi: <strong className="text-slate-200">{comp.userName}</strong> • {new Date(comp.createdAt).toLocaleString('vi-VN')}</span>
                                {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
                                  <button
                                    onClick={() => {
                                      setSelectedChatUserId(comp.userId);
                                      setSupportSubTab('chat');
                                      showToast('success', `Đã mở phòng chat với khách hàng ${comp.userName}`);
                                    }}
                                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1 transition cursor-pointer"
                                    title="Nhắn tin chat với khách hàng"
                                  >
                                    <MessageCircle className="w-3 h-3" /> Nhắn tin chat
                                  </button>
                                )}
                              </div>
                              {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && comp.status === 'pending' && (
                                <button
                                  onClick={() => handleResolveComplaint(comp.id)}
                                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded font-bold transition cursor-pointer"
                                >
                                  Duyệt / Đã xử lý
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SubTab 3: Reviews & Ratings */}
              {supportSubTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Rule Information Banner */}
                  <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/40 rounded-2xl p-5 shadow-xl text-xs space-y-2">
                    <h4 className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Quy định Đánh giá & Góp ý Dịch vụ Bãi đỗ xe
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      • Bạn <strong>CHỈ</strong> được phép gửi đánh giá/góp ý khi lượt đỗ xe đã ở trạng thái <strong>Hoàn tất (Completed)</strong> (đã lấy xe và hoàn thành thanh toán).<br/>
                      • Không cho phép đánh giá tự do bất kỳ lúc nào hoặc đánh giá khi vé/lượt đỗ chưa kết thúc.<br/>
                      • Mỗi lượt đỗ xe hoàn tất chỉ được đánh giá đúng <strong>1 lần</strong>, và cho phép chỉnh sửa <strong>1 lần trong vòng 24 giờ</strong> kể từ lúc tạo.
                    </p>
                  </div>

                  {/* Customer's Completed Tickets for Review */}
                  {currentUser?.role === 'customer' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                        <Car className="w-4 h-4 text-emerald-400" /> Danh sách lượt đỗ xe đã Hoàn tất của bạn
                      </h4>
                      {tickets.filter(t => t.status === 'completed' && (t.customerName.toLowerCase() === currentUser.name.toLowerCase() || (currentUser.phoneNumber && t.phoneNumber === currentUser.phoneNumber))).length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800">
                          Bạn chưa có lượt đỗ xe nào ở trạng thái Hoàn tất (Completed). Hãy hoàn thành thanh toán ít nhất 1 lượt đỗ xe để tiến hành đánh giá dịch vụ!
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tickets.filter(t => t.status === 'completed' && (t.customerName.toLowerCase() === currentUser.name.toLowerCase() || (currentUser.phoneNumber && t.phoneNumber === currentUser.phoneNumber))).map(ticket => {
                            const existingRev = supportReviews.find(r => r.ticketId === ticket.id);
                            const hoursSince = existingRev ? (Date.now() - new Date(existingRev.createdAt).getTime()) / (1000 * 3600) : 0;
                            const canEdit = existingRev && hoursSince <= 24 && !existingRev.updatedAt;

                            return (
                              <div key={ticket.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-extrabold text-emerald-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">{ticket.licensePlate}</span>
                                    <span className="text-white font-bold">Ô đỗ: {ticket.slotNumber}</span>
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Hoàn tất</span>
                                  </div>
                                  <p className="text-slate-400">Thời gian lấy xe: {ticket.checkOutTime ? new Date(ticket.checkOutTime).toLocaleString('vi-VN') : '—'} • Phí: <strong className="text-emerald-400">{(ticket.fee || 0).toLocaleString('vi-VN')} đ</strong></p>
                                  {existingRev && (
                                    <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded mt-1.5 space-y-0.5">
                                      <div className="flex items-center gap-1 font-bold">
                                        Đã đánh giá: {existingRev.rating} ⭐ {existingRev.updatedAt && '(Đã chỉnh sửa)'}
                                      </div>
                                      <p className="text-slate-200 italic">"{existingRev.comment}"</p>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  {!existingRev ? (
                                    <button
                                      onClick={() => {
                                        setSelectedTicketForReview(ticket);
                                        setReviewRating(5);
                                        setReviewComment('');
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-white" /> Viết đánh giá
                                    </button>
                                  ) : canEdit ? (
                                    <button
                                      onClick={() => {
                                        setSelectedTicketForReview(ticket);
                                        setReviewRating(existingRev.rating);
                                        setReviewComment(existingRev.comment);
                                      }}
                                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-slate-950" /> Sửa đánh giá (Còn hạn 24h)
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 font-semibold italic">Đã đánh giá (Đã khóa)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Form Modal when selectedTicketForReview is active */}
                  {selectedTicketForReview && (
                    <div className="bg-slate-950 border border-indigo-500/50 rounded-2xl p-5 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          Đánh giá lượt đỗ xe (Biển số: <span className="font-mono text-emerald-400">{selectedTicketForReview.licensePlate}</span> - Ô {selectedTicketForReview.slotNumber})
                        </h4>
                        <button
                          onClick={() => setSelectedTicketForReview(null)}
                          className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer text-xs"
                        >
                          Hủy / Đóng
                        </button>
                      </div>

                      <form onSubmit={handleSendReview} className="space-y-3.5 text-xs">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1.5">Mức độ hài lòng (Số sao từ 1 đến 5) *</label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                className={`p-2 rounded-lg border transition cursor-pointer flex items-center gap-1 ${reviewRating >= star ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                              >
                                <Star className={`w-4 h-4 ${reviewRating >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                                <span className="font-bold">{star} sao</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Nội dung đánh giá / Góp ý *</label>
                          <textarea
                            rows={3}
                            required
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Dịch vụ bãi đỗ xe rất chuyên nghiệp, an ninh tốt, nhân viên thân thiện..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                          />
                        </div>

                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                        >
                          <Send className="w-4 h-4" /> Gửi đánh giá chính thức
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Reviews Feed */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center justify-between">
                      <span>Đánh giá từ khách hàng ({supportReviews.length})</span>
                      <span className="text-xs text-amber-400 flex items-center gap-1 font-bold">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {supportReviews.length > 0 ? (supportReviews.reduce((s, r) => s + r.rating, 0) / supportReviews.length).toFixed(1) : '5.0'} / 5.0
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {supportReviews.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-slate-500 text-xs italic">Chưa có đánh giá nào. Hãy hoàn tất lượt đỗ xe và chia sẻ trải nghiệm của bạn!</div>
                      ) : (
                        supportReviews.map(rev => (
                          <div key={rev.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{rev.userName}</span>
                              <div className="flex items-center gap-1 text-amber-400">
                                {Array.from({ length: rev.rating }).map((_, i) => (
                                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-slate-300 italic">"{rev.comment}"</p>
                            <p className="text-[11px] text-slate-500 text-right">{new Date(rev.createdAt).toLocaleString('vi-VN')} {rev.updatedAt && '(Đã sửa)'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        

        {activeTab === 'monthly_passes' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Award className="w-6 h-6 text-emerald-400" /> 
                    {currentUser?.role === 'customer' ? 'Vé Tháng & Gói Đăng Ký Gửi Xe Của Tôi' : 'Quản Lý Vé Tháng Toàn Hệ Thống'} 
                    <span className="bg-emerald-500 text-slate-950 text-xs font-extrabold px-2.5 py-0.5 rounded-full ml-2">
                      {currentUser?.role === 'customer' ? parkingSubscriptions.filter(s => s.userId === currentUser.uid).length : parkingSubscriptions.length} gói
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mua mới và gia hạn vé tháng định kỳ, quản lý trạng thái hiệu lực và ngày hết hạn tự động.
                  </p>
                </div>
                {currentUser?.role === 'customer' && (
                  <button
                    onClick={() => {
                      setBuyPassPlate(currentUser.phoneNumber || '');
                      setShowBuyPassModal(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Đăng ký Mua Vé Tháng Mới
                  </button>
                )}
              </div>

              {/* Passes List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentUser?.role === 'customer' ? parkingSubscriptions.filter(s => s.userId === currentUser.uid) : parkingSubscriptions).length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs space-y-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <Award className="w-12 h-12 mx-auto text-slate-500 opacity-40" />
                    <p className="text-slate-400 font-medium">Chưa có gói vé tháng nào được đăng ký.</p>
                    {currentUser?.role === 'customer' && (
                      <button
                        onClick={() => setShowBuyPassModal(true)}
                        className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
                      >
                        Đăng ký gói vé tháng ngay
                      </button>
                    )}
                  </div>
                ) : (
                  (currentUser?.role === 'customer' ? parkingSubscriptions.filter(s => s.userId === currentUser.uid) : parkingSubscriptions).map(sub => {
                    const isExpired = new Date(sub.endDate).getTime() < Date.now();
                    return (
                      <div key={sub.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                              <Award className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">
                                {sub.passType === 'monthly_bike' ? 'Vé tháng Xe máy' : 'Vé tháng Ô tô'}
                              </h4>
                              <p className="text-[11px] text-slate-400">Chủ xe: <strong className="text-white">{sub.userName}</strong></p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${!isExpired ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                            {!isExpired ? '🟢 Đang hiệu lực (Active)' : '🔴 Đã hết hạn (Expired)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div><span className="text-slate-400">Biển số xe:</span> <strong className="text-emerald-400 font-mono text-sm ml-1">{sub.licensePlate}</strong></div>
                          <div><span className="text-slate-400">Mức giá:</span> <strong className="text-white font-mono ml-1">{(sub.price || 0).toLocaleString('vi-VN')} đ</strong></div>
                          <div><span className="text-slate-400">Ngày bắt đầu:</span> <strong className="text-slate-200 ml-1">{new Date(sub.startDate).toLocaleDateString('vi-VN')}</strong></div>
                          <div><span className="text-slate-400">Ngày hết hạn:</span> <strong className="text-amber-400 ml-1">{new Date(sub.endDate).toLocaleDateString('vi-VN')}</strong></div>
                        </div>

                        {currentUser?.role === 'customer' && (
                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Gia hạn thêm 30 ngày (Trừ ví):</span>
                            <button
                              onClick={() => handleRenewPass(sub)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Gia hạn ngay ({sub.price.toLocaleString('vi-VN')}đ)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit_logs' && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Nhật ký Hoạt động & Lịch sử Thao tác Hệ thống
                    <span className="bg-indigo-500 text-slate-950 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                      {auditLogs.length} bản ghi
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Lịch sử chi tiết gồm: Xác nhận thanh toán & nạp ví, Quản lý/Sửa hồ sơ nhân viên & khách hàng, và Lịch sử tự sửa hồ sơ cá nhân.
                  </p>
                </div>
              </div>
              <button
                onClick={() => showToast('success', 'Đã cập nhật nhật ký hoạt động thời gian thực!')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer shrink-0"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Làm mới
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <History className="w-4 h-4 text-indigo-400" /> Bảng Nhật ký Hoạt động Realtime
                </h3>
                <span className="text-xs text-slate-400">Được ghi nhận tự động từ mọi thao tác trong hệ thống</span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Người thực hiện</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Hành động</th>
                      <th className="p-3">Chi tiết nội dung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                          Chưa có nhật ký hoạt động nào được ghi nhận.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-950/40 transition">
                          <td className="p-3 font-mono text-slate-300">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                          <td className="p-3 font-bold text-white">{log.userName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.userRole === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : log.userRole === 'staff'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {log.userRole}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-indigo-300">{log.action}</td>
                          <td className="p-3 text-slate-300">{log.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Check-in Modal with Strict Validation */}
      {showCheckInModal && selectedSlotForCheckIn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold">Gửi xe vào ô {selectedSlotForCheckIn.slotNumber}</h3>
                <p className="text-xs text-slate-400">{selectedSlotForCheckIn.zoneName}</p>
              </div>
              <button
                onClick={() => { setShowCheckInModal(false); setValidationError(''); }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <div>
                  <p className="font-bold mb-0.5">Vi phạm ràng buộc nghiệp vụ!</p>
                  <p>{validationError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Biển số xe (License Plate)</label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                    TT 79 & 81/2024/TT-BCA
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={checkInPlate}
                  onChange={(e) => setCheckInPlate(e.target.value)}
                  placeholder="29A-123.45 hoặc 59P1-123.45"
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm focus:outline-none uppercase font-mono tracking-wider transition ${
                    !checkInPlate
                      ? 'border-slate-700 focus:border-emerald-400'
                      : validateVietnameseLicensePlate(checkInPlate).isValid
                      ? 'border-emerald-500/80 text-emerald-300 focus:border-emerald-400'
                      : 'border-red-500/80 text-red-300 focus:border-red-400'
                  }`}
                />
                
                {/* Real-time feedback status */}
                {checkInPlate ? (() => {
                  const check = validateVietnameseLicensePlate(checkInPlate);
                  return check.isValid ? (
                    <div className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Định dạng chuẩn: <strong className="font-mono text-white bg-emerald-900/80 px-1.5 py-0.5 rounded">{check.formatted}</strong></span>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-400 mt-1.5 flex items-start gap-1.5 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <span>{check.reason}</span>
                    </div>
                  );
                })() : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cú pháp chuẩn: Mã tỉnh (11-99) + Sê-ri (VD: A, K, P1, LD) + 4-5 số (VD: 29A-123.45, 50K-888.88, 59P1-123.45, 29LD-123.45)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Loại phương tiện</label>
                <select
                  value={checkInVehicleType}
                  onChange={(e) => setCheckInVehicleType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="car">Ô tô 4-7 chỗ (Car)</option>
                  <option value="suv">Xe SUV / Bán tải</option>
                  <option value="sedan">Xe Sedan</option>
                  <option value="motorbike">Xe máy (Motorbike)</option>
                  <option value="electric">Xe điện (Electric EV)</option>
                </select>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Hạng tài khoản hệ thống:</span>
                {currentUser.role === 'customer' ? (
                  currentUser.membershipTier === 'vip' ? (
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Khách hàng VIP
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold">
                      Khách hàng Thường
                    </span>
                  )
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                    {currentUser.role === 'admin' ? 'Quản trị viên (VIP)' : 'Nhân viên Bãi xe'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tên khách hàng</label>
                  <input
                    type="text"
                    value={checkInCustomerName}
                    onChange={(e) => setCheckInCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={checkInPhone}
                    onChange={(e) => setCheckInPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCheckInModal(false); setValidationError(''); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Xác nhận Gửi xe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-out Modal with Payment Method Options */}
      {showCheckOutModal && selectedTicketForCheckOut && (() => {
        const checkOutTime = new Date();
        const checkInDate = new Date(selectedTicketForCheckOut.checkInTime);
        const diffHours = Math.max(0, (checkOutTime.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
        const diffShifts = Math.max(1, Math.ceil(diffHours / 7));
        
        let ratePerShift = tariffSettings.motorbikeRate;
        if (selectedTicketForCheckOut.vehicleType === 'car' || selectedTicketForCheckOut.vehicleType === 'suv' || selectedTicketForCheckOut.vehicleType === 'sedan') {
          ratePerShift = selectedTicketForCheckOut.isVip ? tariffSettings.carVipRate : tariffSettings.carStandardRate;
        } else if (selectedTicketForCheckOut.vehicleType === 'electric') {
          ratePerShift = tariffSettings.electricRate;
        }

        const checkOutHour = checkOutTime.getHours();
        let surchargePercent = 0;
        if ((checkOutHour >= 7 && checkOutHour <= 9) || (checkOutHour >= 17 && checkOutHour <= 19)) {
          surchargePercent = tariffSettings.peakHourSurchargePercent;
        } else if (checkOutHour >= 22 || checkOutHour <= 6) {
          surchargePercent = tariffSettings.nightHourSurchargePercent;
        }

        const baseFee = diffShifts * ratePerShift;
        const calculatedFee = Math.round(baseFee * (1 + surchargePercent / 100));
        const targetUser = usersList.find(u => u.name === selectedTicketForCheckOut.customerName || u.phoneNumber === selectedTicketForCheckOut.phoneNumber) || currentUser;
        const walletBal = targetUser?.walletBalance ?? 200000;
        const isWalletSufficient = walletBal >= calculatedFee;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold">Thanh toán & Trả xe (Check-out)</h3>
                  <p className="text-xs text-slate-400">Vị trí ô đỗ: <strong className="text-emerald-400">{selectedTicketForCheckOut.slotNumber}</strong></p>
                </div>
                <button
                  onClick={() => setShowCheckOutModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ticket Summary */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Biển số xe:</span>
                  <span className="font-mono font-extrabold text-white text-base bg-slate-900 px-2.5 py-1 rounded border border-slate-700">{selectedTicketForCheckOut.licensePlate}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Loại xe / Hạng:</span>
                  <span className="font-semibold uppercase text-slate-200">{selectedTicketForCheckOut.vehicleType} {selectedTicketForCheckOut.isVip && '(VIP)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Khách gửi:</span>
                  <span className="font-medium text-slate-200">{selectedTicketForCheckOut.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Thời gian vào:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedTicketForCheckOut.checkInTime).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Thời gian đỗ:</span>
                  <span className="font-semibold">{diffHours < 1 ? 'Dưới 1 giờ' : `${diffHours.toFixed(1)} giờ`} ({diffShifts} ca đỗ)</span>
                </div>
              </div>

              {/* Total Fee & Points Badge */}
              <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Tổng phí thanh toán</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {calculatedFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-300 block">Tích lũy điểm</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> +{Number((calculatedFee / 20000).toFixed(2))} điểm
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Chọn hình thức thanh toán</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('wallet')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedPaymentMethod === 'wallet'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <span>Ví tài khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('transfer')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedPaymentMethod === 'transfer'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-indigo-400" />
                    <span>Chuyển khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedPaymentMethod === 'cash'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <span>Tiền mặt</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Payment Method View */}
              {selectedPaymentMethod === 'wallet' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400" /> Số dư ví ({targetUser?.name}):
                    </span>
                    <span className="font-mono font-bold text-white text-sm">
                      {walletBal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {isWalletSufficient ? (
                    <div className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40 flex items-center justify-between">
                      <span>Số dư sau thanh toán:</span>
                      <strong className="font-mono text-white text-sm">{(walletBal - calculatedFee).toLocaleString('vi-VN')} đ</strong>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-amber-400 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <p className="font-bold">Số dư ví không đủ thanh toán!</p>
                          <p className="text-[11px] text-slate-300">Cần {calculatedFee.toLocaleString('vi-VN')} đ (Còn thiếu {(calculatedFee - walletBal).toLocaleString('vi-VN')} đ).</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTopUpTargetUser(targetUser);
                          setTopUpAmount(Math.max(50000, calculatedFee - walletBal));
                          setShowTopUpModal(true);
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Nạp tiền vào ví ngay
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedPaymentMethod === 'transfer' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-300 font-medium">Quét mã VietQR bằng ứng dụng Ngân hàng / MOMO / ZaloPay (Tự động điền số tiền)</p>
                  <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-700">
                    <img 
                      src={`https://img.vietqr.io/image/MB-7920141546131-compact2.png?amount=${calculatedFee}&addInfo=TT%20XE%20${encodeURIComponent(selectedTicketForCheckOut.licensePlate)}%20${selectedTicketForCheckOut.slotNumber}&accountName=NGUYEN%20HUU%20PHUOC`}
                      alt="Mã VietQR Thanh Toán"
                      className="w-44 h-44 object-contain mx-auto"
                    />
                  </div>
                  <div className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-left font-mono">
                    <div className="flex justify-between"><span className="text-slate-400">Ngân hàng:</span><span className="text-slate-200 font-bold">MB Bank (TMCP Quân đội)</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Số tài khoản:</span><span className="text-indigo-400 font-bold text-sm">7920141546131</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Chủ tài khoản:</span><span className="text-slate-200 font-bold">NGUYEN HUU PHUOC</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Số tiền tự động:</span><span className="text-amber-400 font-bold">{calculatedFee.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Nội dung CK:</span><span className="text-emerald-400 font-bold">TT XE {selectedTicketForCheckOut.licensePlate}</span></div>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'cash' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <DollarSign className="w-5 h-5" /> Thanh toán Tiền mặt trực tiếp
                  </div>
                  <p>Nhân viên / Admin thu trực tiếp số tiền <strong className="text-white font-mono">{calculatedFee.toLocaleString('vi-VN')} đ</strong> từ khách hàng khi giao chìa khóa/xuất bãi.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCheckOutModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={selectedPaymentMethod === 'wallet' && !isWalletSufficient}
                  onClick={() => handleCheckOut(selectedTicketForCheckOut, selectedPaymentMethod)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
                    selectedPaymentMethod === 'wallet' && !isWalletSufficient
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Xác nhận Trả xe & Thanh toán
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top-Up Wallet Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <Wallet className="w-5 h-5 text-emerald-400" /> Nạp tiền vào Ví tài khoản
                </h3>
                <p className="text-xs text-slate-400">
                  Nạp cho: <strong className="text-white">{(topUpTargetUser || currentUser)?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => { setShowTopUpModal(false); setTopUpTargetUser(null); }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopUpWalletSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Chọn số tiền nạp nhanh (VNĐ)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setTopUpAmount(amt); setCustomTopUpInput(''); }}
                      className={`p-2.5 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
                        topUpAmount === amt && !customTopUpInput
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      +{amt.toLocaleString('vi-VN')} đ
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hoặc nhập số tiền tùy chỉnh (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 150000"
                  value={customTopUpInput}
                  onChange={(e) => { setCustomTopUpInput(e.target.value); }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              {/* VietQR Transfer Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                <span className="text-xs text-slate-300 font-medium block">
                  Chuyển khoản VietQR nạp ví: <strong className="text-emerald-400 font-mono text-sm">{(customTopUpInput ? parseInt(customTopUpInput, 10) || 0 : topUpAmount).toLocaleString('vi-VN')} đ</strong>
                </span>
                <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-700">
                  <img
                    src={`https://img.vietqr.io/image/MB-7920141546131-compact2.png?amount=${customTopUpInput ? parseInt(customTopUpInput, 10) || 0 : topUpAmount}&addInfo=NAP%20VI%20${encodeURIComponent((topUpTargetUser || currentUser)?.phoneNumber || (topUpTargetUser || currentUser)?.name || 'KH')}&accountName=NGUYEN%20HUU%20PHUOC`}
                    alt="VietQR Nạp Ví"
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>
                <div className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-left font-mono">
                  <div className="flex justify-between"><span className="text-slate-400">Ngân hàng:</span><span className="text-slate-200 font-bold">MB Bank (TMCP Quân đội)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Số tài khoản:</span><span className="text-indigo-400 font-bold">7920141546131</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Tên tài khoản:</span><span className="text-slate-200 font-bold">NGUYEN HUU PHUOC</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Nội dung:</span><span className="text-emerald-400 font-bold">NAP VI {(topUpTargetUser || currentUser)?.phoneNumber || (topUpTargetUser || currentUser)?.name}</span></div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowTopUpModal(false); setTopUpTargetUser(null); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Xác nhận đã chuyển khoản & Nạp ví
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet History Modal */}
      {showWalletHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-white space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <History className="w-5 h-5 text-emerald-400" /> Lịch sử Biến động Ví tài khoản
                </h3>
                <p className="text-xs text-slate-400">Theo dõi chi tiết lịch sử nạp tiền và thanh toán phí gửi xe qua ví</p>
              </div>
              <button
                onClick={() => setShowWalletHistoryModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {walletTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">Chưa có giao dịch ví nào được ghi nhận.</div>
              ) : (
                walletTransactions.map((tx) => (
                  <div key={tx.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${tx.type === 'topup' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {tx.type === 'topup' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{tx.userName} • {new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${tx.type === 'topup' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {tx.type === 'topup' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Check-Out List Modal */}
      {showQuickCheckOutListModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-400" /> Lấy xe ra khỏi bãi (Check-out)
                </h3>
                <p className="text-xs text-slate-400">Chọn xe đang đỗ để thực hiện trả xe và giải phóng ô đỗ</p>
              </div>
              <button
                onClick={() => setShowQuickCheckOutListModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tickets.filter(t => {
                if (t.checkOutTime) return false;
                if (currentUser?.role === 'customer') {
                  const isMyTicket = 
                    t.userId === currentUser.uid || 
                    (currentUser.name && t.customerName && t.customerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
                    (currentUser.phoneNumber && t.phoneNumber && t.phoneNumber === currentUser.phoneNumber);
                  return isMyTicket;
                }
                return true;
              }).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {currentUser?.role === 'customer' ? 'Bạn chưa có xe nào đang đỗ trong bãi.' : 'Không có xe nào đang đỗ trong bãi.'}
                </div>
              ) : (
                tickets.filter(t => {
                  if (t.checkOutTime) return false;
                  if (currentUser?.role === 'customer') {
                    const isMyTicket = 
                      t.userId === currentUser.uid || 
                      (currentUser.name && t.customerName && t.customerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
                      (currentUser.phoneNumber && t.phoneNumber && t.phoneNumber === currentUser.phoneNumber);
                    return isMyTicket;
                  }
                  return true;
                }).map(t => (
                  <div key={t.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-emerald-400">Ô {t.slotNumber}</span>
                        <span className="font-bold text-slate-100 text-sm">{t.licensePlate}</span>
                        {t.isVip && <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold">VIP</span>}
                      </div>
                      <p className="text-slate-400">{t.customerName} • Vào lúc: {new Date(t.checkInTime).toLocaleString('vi-VN')}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowQuickCheckOutListModal(false);
                        setSelectedTicketForCheckOut(t);
                        setShowCheckOutModal(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-2 rounded-lg transition shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      Lấy xe ra
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowQuickCheckOutListModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-400" /> Chỉnh sửa hồ sơ cá nhân
                </h3>
                <p className="text-xs text-slate-400">Cập nhật thông tin tài khoản của bạn</p>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nhập họ tên của bạn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Giới tính</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Số nhà, đường, quận/huyện..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email tài khoản</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.email}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* Password Change Section inside Edit Profile */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" /> Đổi mật khẩu tài khoản
                </h4>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Mật khẩu hiện tại (Bỏ trống nếu không đổi)</label>
                  <input
                    type="password"
                    value={editCurrentPassword}
                    onChange={(e) => setEditCurrentPassword(e.target.value)}
                    placeholder="Mật khẩu hiện tại"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={editConfirmNewPassword}
                      onChange={(e) => setEditConfirmNewPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfileModal(false);
                    setSelectedBgTheme(currentUser.bgTheme || 'cyber-dark');
                    setCustomBgUrlInput(currentUser.bgCustomUrl || '');
                    setShowThemeModal(true);
                  }}
                  className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-indigo-400" /> Tùy chỉnh Phông nền Giao diện tài khoản
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Customizer Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Cài đặt Phông nền Giao diện</h3>
                  <p className="text-xs text-slate-400">Tùy chỉnh màu sắc & phông nền không gian làm việc cho tài khoản của bạn</p>
                </div>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {BG_THEMES.map((theme) => {
                const isSelected = selectedBgTheme === theme.id;
                const thumbUrl = theme.id === 'custom' 
                  ? (customBgUrlInput || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=400') 
                  : theme.imageUrl;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedBgTheme(theme.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-400 ring-2 ring-emerald-500/40 shadow-xl'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className="truncate">{theme.name}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${theme.badge}`}>
                        {isSelected ? 'Đang chọn' : 'Xem trước'}
                      </span>
                    </div>

                    {/* Wallpaper Thumbnail Image Preview */}
                    <div className="h-24 w-full rounded-lg overflow-hidden relative border border-slate-800 bg-slate-950">
                      {thumbUrl ? (
                        <img 
                          src={thumbUrl} 
                          alt={theme.name} 
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/aistudio/sunset_parking.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs italic">
                          Nhập URL ảnh bên dưới
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-tight">{theme.sub}</p>
                  </div>
                );
              })}
            </div>

            {selectedBgTheme === 'custom' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                <label className="block text-xs font-medium text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" /> Nhập URL Hình ảnh phông nền (Image URL)
                </label>
                <input
                  type="url"
                  value={customBgUrlInput}
                  onChange={(e) => setCustomBgUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1506521781263-d8422e82f27a..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 font-mono text-slate-200"
                />
                <p className="text-[11px] text-slate-400">Hỗ trợ các đường dẫn ảnh PNG, JPG, WebP trực tuyến từ Unsplash, Imgur hoặc Google Drive public.</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSaveBgTheme('cyber-dark', '')}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Khôi phục phông nền mặc định
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowThemeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBgTheme(selectedBgTheme, customBgUrlInput)}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Áp dụng Phông nền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {showEditSlotModal && selectedSlotForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" /> Chỉnh sửa ô đỗ {selectedSlotForEdit.slotNumber}
                </h3>
                <p className="text-xs text-slate-400">Thay đổi số ô hoặc chuyển đổi loại xe / khu vực</p>
              </div>
              <button
                onClick={() => setShowEditSlotModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSlot} className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] text-slate-400 block">Trạng thái hiện tại: <strong className={selectedSlotForEdit.status === 'occupied' ? 'text-rose-400' : 'text-emerald-400'}>{selectedSlotForEdit.status === 'occupied' ? 'Đang đỗ (Occupied)' : 'Trống (Available)'}</strong></span>
                <button
                  type="button"
                  onClick={handleResetSingleSlotToEmpty}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Reset ô này thành Ô Trống (Available)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Số ô đỗ</label>
                <input
                  type="text"
                  required
                  value={editSlotNumber}
                  onChange={(e) => setEditSlotNumber(e.target.value)}
                  placeholder="VD: A09, B05"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Loại ô & Khu vực</label>
                <select
                  value={editSlotType}
                  onChange={(e) => setEditSlotType(e.target.value as SlotType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="car_standard">Khu A - Ô tô Thường (30k/ca - 7 tiếng)</option>
                  <option value="car_vip">Khu B - Ô tô VIP (50k/ca - 7 tiếng - Chỉ dành cho VIP)</option>
                  <option value="motorbike">Khu C - Xe máy (10k/ca - 7 tiếng)</option>
                  <option value="electric">Khu D - Xe điện & Sạc (20k/ca - 7 tiếng)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditSlotModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20"
                >
                  Lưu thay đổi ô đỗ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal for Admin */}
      {showManageUsersModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" /> Sửa hồ sơ người dùng
                </h3>
                <p className="text-xs text-slate-400">Cập nhật thông tin, quyền hạn hoặc điểm tích lũy</p>
              </div>
              <button
                onClick={() => setShowManageUsersModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManagedUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email (Không đổi)</label>
                <input
                  type="text"
                  disabled
                  value={uEmail}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vai trò (Role) {selectedUserForEdit?.email.toLowerCase() === 'admin@parking.vn' && <span className="text-amber-400 text-[10px]">(Cố định Admin)</span>}
                  </label>
                  <select
                    value={uRole}
                    disabled={selectedUserForEdit?.email.toLowerCase() === 'admin@parking.vn'}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 ${selectedUserForEdit?.email.toLowerCase() === 'admin@parking.vn' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="customer">Khách hàng (Customer)</option>
                    <option value="staff">Nhân viên (Staff)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={uPhone}
                    onChange={(e) => setUPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {uRole === 'customer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hạng thành viên</label>
                    <select
                      value={uTier}
                      onChange={(e) => setUTier(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value="regular">Khách hàng Thường</option>
                      <option value="vip">Khách hàng VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Điểm tích lũy</label>
                    <input
                      type="number"
                      value={uPoints}
                      onChange={(e) => setUPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={uAddress}
                  onChange={(e) => setUAddress(e.target.value)}
                  placeholder="Địa chỉ khách hàng / nhân viên"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowManageUsersModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal for Admin */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-400" /> Thêm tài khoản mới
                </h3>
                <p className="text-xs text-slate-400">Tạo tài khoản mới cho Khách hàng, Nhân viên hoặc Admin</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu *</label>
                <input
                  type="password"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Mật khẩu tạo mới"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vai trò (Role)</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  >
                    <option value="customer">Khách hàng</option>
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {addRole === 'customer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hạng thành viên</label>
                    <select
                      value={addTier}
                      onChange={(e) => setAddTier(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    >
                      <option value="regular">Khách hàng Thường</option>
                      <option value="vip">Khách hàng VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Điểm tích lũy ban đầu</label>
                    <input
                      type="number"
                      value={addPoints}
                      onChange={(e) => setAddPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  placeholder="Địa chỉ liên hệ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Thêm tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Xác nhận xóa tài khoản</h3>
                  <p className="text-xs text-slate-400">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Bạn có chắc chắn muốn XÓA vĩnh viễn tài khoản sau khỏi hệ thống?
              </p>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <p><span className="text-slate-400">Họ và tên:</span> <strong className="text-white ml-1">{userToDelete.name}</strong></p>
                <p><span className="text-slate-400">Email:</span> <strong className="text-emerald-400 ml-1">{userToDelete.email}</strong></p>
                <p><span className="text-slate-400">ID tài khoản:</span> <code className="text-purple-300 font-mono ml-1">{userToDelete.uid}</code></p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Monthly Pass Modal */}
      {showBuyPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Đăng ký Gói Vé Tháng Gửi Xe</h3>
                  <p className="text-xs text-slate-400">Thời hạn sử dụng: 30 ngày kể từ khi kích hoạt</p>
                </div>
              </div>
              <button
                onClick={() => setShowBuyPassModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBuyMonthlyPassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Chọn gói vé tháng *</label>
                <select
                  value={buyPassType}
                  onChange={(e) => setBuyPassType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="monthly_bike">🛵 Vé tháng Xe máy ({tariffSettings.monthlyBikePass.toLocaleString('vi-VN')} đ / 30 ngày)</option>
                  <option value="monthly_car">🚗 Vé tháng Ô tô chuẩn ({tariffSettings.monthlyCarPass.toLocaleString('vi-VN')} đ / 30 ngày)</option>
                  <option value="monthly_electric">⚡ Vé tháng Xe điện EV ({tariffSettings.monthlyCarPass.toLocaleString('vi-VN')} đ / 30 ngày)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Biển số xe đăng ký *</label>
                <input
                  type="text"
                  required
                  value={buyPassPlate}
                  onChange={(e) => setBuyPassPlate(e.target.value)}
                  placeholder="VD: 29A-123.45 hoặc 59P1-888.88"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Hình thức thanh toán</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBuyPassPaymentMethod('wallet')}
                    className={`p-2.5 rounded-xl border font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${buyPassPaymentMethod === 'wallet' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Ví ({currentUser?.walletBalance?.toLocaleString('vi-VN')}đ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyPassPaymentMethod('transfer')}
                    className={`p-2.5 rounded-xl border font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${buyPassPaymentMethod === 'transfer' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <QrCode className="w-4 h-4 text-indigo-400" />
                    <span>Chuyển khoản</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyPassPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${buyPassPaymentMethod === 'cash' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <span>Tiền mặt</span>
                  </button>
                </div>
              </div>

              {buyPassPaymentMethod === 'transfer' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-2">
                  <p className="text-slate-300">Quét mã VietQR chuyển tiền gói vé tháng:</p>
                  <div className="bg-white p-2 rounded-xl inline-block">
                    <img 
                      src={`https://img.vietqr.io/image/MB-7920141546131-compact2.png?amount=${buyPassType === 'monthly_bike' ? tariffSettings.monthlyBikePass : tariffSettings.monthlyCarPass}&addInfo=VE%20THANG%20${encodeURIComponent(buyPassPlate || 'XE')}&accountName=NGUYEN%20HUU%20PHUOC`}
                      alt="VietQR Vé Tháng"
                      className="w-36 h-36 object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBuyPassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Xác nhận Mua gói Vé tháng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-400" /> Trung tâm Thông báo
                </h3>
                <p className="text-xs text-slate-400">
                  {currentUser?.role === 'customer' ? 'Thông báo cá nhân về lịch sử gửi xe, xác nhận và lời mời đánh giá.' : 'Thông báo hệ thống dành cho Nhân viên & Admin.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      for (const n of myNotifications) {
                        if (!n.isRead) {
                          await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                        }
                      }
                      showToast('success', 'Đã đánh dấu tất cả là đã đọc.');
                    } catch (err) {
                      showToast('error', 'Lỗi khi cập nhật trạng thái thông báo.');
                    }
                  }}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                >
                  Đọc tất cả
                </button>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {myNotifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                  <Bell className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                  <p>Không có thông báo nào.</p>
                </div>
              ) : (
                myNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={async () => {
                      if (!n.isRead) {
                        try {
                          await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                        } catch (err) {}
                      }
                    }}
                    className={`p-4 rounded-xl border transition flex items-start gap-3 cursor-pointer ${n.isRead ? 'bg-slate-950/40 border-slate-800/80 text-slate-300' : 'bg-emerald-950/20 border-emerald-500/40 text-white shadow-md'}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${n.type === 'booking' ? 'bg-emerald-500/20 text-emerald-400' : n.type === 'payment' ? 'bg-amber-500/20 text-amber-400' : n.type === 'review' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {n.type === 'booking' ? <Car className="w-4 h-4" /> : n.type === 'payment' ? <Wallet className="w-4 h-4" /> : n.type === 'review' ? <Star className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold">{n.title}</h4>
                        <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date(n.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <p className="text-xs text-slate-300">{n.message}</p>
                      {!n.isRead && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mt-1"></span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Ticket QR Modal Popup */}
      {showAdminQrModal && selectedTicketForAdminQR && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  <QrCode className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Mã QR Vé Xe #{selectedTicketForAdminQR.id}</h3>
                  <p className="text-xs text-slate-400">Tra cứu & Quét xác thực cho xe ra bãi</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminQrModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image Card */}
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center border border-slate-700">
              <QRCodeSVG value={selectedTicketForAdminQR.id} size={210} level="H" includeMargin={true} />
              <p className="mt-2 text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                {selectedTicketForAdminQR.id}
              </p>
            </div>

            {/* Ticket Details Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Biển số xe:</span>
                <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {selectedTicketForAdminQR.licensePlate}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Ô đỗ / Hạng xe:</span>
                <span className="font-bold text-emerald-400">
                  [{selectedTicketForAdminQR.slotNumber}] - {selectedTicketForAdminQR.vehicleType.toUpperCase()} {selectedTicketForAdminQR.isVip ? '(VIP)' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Khách gửi:</span>
                <span className="font-medium text-slate-200">{selectedTicketForAdminQR.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Thời gian gửi:</span>
                <span className="font-mono text-slate-300">{new Date(selectedTicketForAdminQR.checkInTime).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">Trạng thái vé:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedTicketForAdminQR.status === 'completed' || selectedTicketForAdminQR.checkOutTime ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                  {selectedTicketForAdminQR.status === 'completed' || selectedTicketForAdminQR.checkOutTime ? 'Đã hoàn thành' : 'Đang đỗ'}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedTicketForAdminQR.id);
                  showToast('success', 'Đã sao chép Mã vé vào khay nhớ tạm!');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                Sao chép mã vé
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminQrModal(false);
                    setActiveTab('staff_scanner');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-purple-500/20"
                >
                  <QrCode className="w-4 h-4" /> Đến Trạm Quét QR
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminQrModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Smart Parking Footer Component */}
      <footer className="mt-16 bg-slate-950/95 border-t border-slate-800/80 text-slate-300 pt-12 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden backdrop-blur-md">
        {/* Decorative gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">Smart Parking</h3>
                <p className="text-[11px] text-emerald-400 font-medium">Hệ thống Quản lý Bãi Đỗ Xe Thông Minh</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nền tảng tự động hóa quản lý bãi đỗ xe thời gian thực hàng đầu Việt Nam. Tích hợp AI kiểm tra quy tắc xe, đặt chỗ thông minh, ví điện tử & thanh toán không tiền mặt.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/40 transition">
                <span className="text-xs font-bold">f</span>
              </a>
              <a href="https://zalo.me" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/40 transition">
                <span className="text-[10px] font-bold">Z</span>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/40 transition">
                <span className="text-[10px] font-bold">▶</span>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/40 transition">
                <span className="text-[10px] font-bold">in</span>
              </a>
            </div>
          </div>

          {/* Col 2: Contact & Address */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Trụ sở & Địa chỉ bãi đỗ
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <p className="flex items-start gap-2 leading-relaxed">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Số 68 Đường Nguyễn Chí Thanh, Phường Láng Thượng, Quận Đống Đa, Hà Nội</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hotline 24/7: <strong className="text-white">1900 8888 68</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Email: <strong className="text-white">support@smartparking.vn</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Giờ mở cửa: <strong className="text-emerald-400">24/7 (Kể cả Lễ, Tết)</strong></span>
              </p>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Tiện ích Hệ thống
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-emerald-400">›</span> Sơ đồ bãi đỗ xe real-time (Zone A, B, C, D)
              </li>
              <li>
                <span className="text-emerald-400">›</span> Tra cứu vé & Kiểm tra quy tắc xe
              </li>
              <li>
                <span className="text-emerald-400">›</span> Nạp ví điện tử & Thanh toán QR
              </li>
              <li>
                <span className="text-emerald-400">›</span> Đặc quyền Khách hàng VIP & Tích điểm
              </li>
              <li>
                <span className="text-emerald-400">›</span> Hỗ trợ trực tuyến 24/7 & Khiếu nại
              </li>
            </ul>
          </div>

          {/* Col 4: Embedded Map Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Bản đồ & Chỉ đường
            </h4>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.3468424892453!2d105.8072657!3d21.0188036!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab671589feb1%3A0x5777f71135c3bf1b!2zNjggxJAuIE5ndXnhu4VuIENow60gVGhhbmgs LEzDoW5nLCBIw6AgTuG7mWkgMTE1MDAsIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1793096896998!5m2!1svi!2s" 
                width="100%" 
                height="150" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-36 filter contrast-125 brightness-90"
              />
            </div>
            <p className="text-[11px] text-slate-400 italic">Địa chỉ: 68 Đường Nguyễn Chí Thanh, Láng, Hà Nội.</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 Smart Parking Management System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Chính sách bảo mật</span>
            <span className="hover:text-slate-400 cursor-pointer">Điều khoản dịch vụ</span>
            <span className="hover:text-slate-400 cursor-pointer">Quy chế hoạt động bãi đỗ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
