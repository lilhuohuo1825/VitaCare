import { Component, OnInit, ChangeDetectorRef, effect, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthTestService, QuizResultReq } from '../../../core/services/health-test.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoinService } from '../../../core/services/coin.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Một dòng trong modal “Xem lịch sử kiểm tra sức khỏe” (theo bài + kết quả mới nhất). */
interface HealthOverviewItem {
  quiz: any;
  latest: any | null;
  isOverdue: boolean;
  isHighRisk: boolean;
  isSafe: boolean;
}

@Component({
  selector: 'app-health-test',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './health-test.html',
  styleUrls: ['./health-test.css']
})
export class HealthTestComponent implements OnInit {
  screen: 'list' | 'intro' | 'quiz' | 'result' = 'list';
  quizzes: any[] = [];
  selectedQuiz: any = null;
  currentQ: number = 0;
  answers: { [key: number]: string } = {};
  result: any = null;
  isLoggedIn: boolean = false; // Mock auth
  historyRecords: any[] = [];
  showQuizHistoryModal = false;
  historyLoading = false;
  historyModalQuiz: any = null;

  /** Tổng quan lịch sử (chỉ khi đã đăng nhập — vãng lai không thấy nút, không gọi API). */
  showHealthOverviewModal = false;
  healthOverviewLoading = false;
  healthOverviewTab: 'all' | 'overdue' | 'risk' | 'safe' = 'all';
  healthOverviewItems: HealthOverviewItem[] = [];

  /** Mỗi lần hoàn thành bài test — dùng để idempotent nhận xu trên server */
  quizClaimToken: string | null = null;
  quizCoinClaimed = false;
  quizCoinBusy = false;
  quizCoinHint = '';

  /** Popup chúc mừng + túi bay (giống nhắc lịch) */
  readonly quizCoinRewardAmount = 50;
  showQuizClaimCelebration = false;
  /** Popup khi đã nhận đủ xu bài test trong ngày (lần thứ 3 trở đi). */
  showQuizDailyLimitPopup = false;
  /** Vãng lai: bấm nhận xu → nhắc đăng nhập (chưa có túi xu). */
  showQuizGuestLoginPopup = false;
  showQuizFlyingCoin = false;
  flyStartX = 0;
  flyStartY = 0;
  flyOffsetPath = "path('M 0 0 Q 0 0 0 0')";

  /** Gửi kèm submitResult (khách không còn màn điền form — để trống). */
  form = {
    name: '', province: '', phone: '', dob: '', gender: 'Nam', referralCode: '', agreed: true
  };

  @ViewChild('quizClaimBurstBtn') quizClaimBurstBtn?: ElementRef<HTMLButtonElement>;

  constructor(
    private healthTestService: HealthTestService,
    private authService: AuthService,
    private coinService: CoinService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const u = this.authService.currentUser();
      this.isLoggedIn = !!u;
      if (!u) {
        this.showHealthOverviewModal = false;
        this.showQuizHistoryModal = false;
      }
      this.cdr.markForCheck();
    });
  }

  /**
   * Danh sách bài test: badge vàng → xám khi đã nhận đủ 2 lần (100 xu) trong ngày VN; ngày mới tự về vàng.
   */
  readonly listQuizCoinBadgeExhausted = computed(() => {
    this.coinService.coinData();
    if (!this.authService.currentUser()) return false;
    return this.coinService.isQuizHealthDailyRewardCapReached();
  });

  ngOnInit(): void {
    // Check auth status
    this.isLoggedIn = !!this.authService.currentUser();

    // Đồng nhất màu với trang chủ: một màu chủ đạo (vc-main + vc-main-bg)
    const unifiedColor = '#00589F';
    const unifiedBg = '#DAECFF';
    /** Tầm soát định kỳ ~1 tuần: hiện nhắc + nút cảnh báo trong lịch sử. Đặt false nếu bài không theo chu kỳ tuần. */
    const quizUIMap: any = {
      '01_Benh_Hen': { icon: 'pulmonology', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: true },
      '02_COPD_Man_Tinh': { icon: 'air', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: true },
      '03_Lam_Dung_Thuoc_Hen': { icon: 'medication', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: true },
      '04_GERD': { icon: 'info', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: true },
      '05_Suy_Gian_Tinh_Mach': { icon: 'monitor_heart', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: true },
      '09_Tri_Nho_TNmindtest': { icon: 'psychology', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: false },
      '10_Tim_Mach_Than_Chuyen_Hoa': { icon: 'favorite', color: unifiedColor, bgColor: unifiedBg, weeklyScreening: true }
    };

    this.healthTestService.getQuizzes().subscribe({
      next: (data: any[]) => {
        this.quizzes = data.map(q => ({
          ...q,
          icon: quizUIMap[q.quiz_id]?.icon || 'quiz',
          color: quizUIMap[q.quiz_id]?.color || unifiedColor,
          bgColor: quizUIMap[q.quiz_id]?.bgColor || unifiedBg,
          weeklyScreening: quizUIMap[q.quiz_id]?.weeklyScreening !== false
        }));
        this.cdr.markForCheck();
        // Nếu vào từ trang chủ với ?quiz=xxx thì tự mở bài quiz đó
        const quizId = this.route.snapshot.queryParamMap.get('quiz');
        if (quizId) {
          const quiz = this.quizzes.find(q => (q.quiz_id || q.id) === quizId);
          if (quiz) this.startQuiz(quiz);
        }
      },
      error: (err: any) => console.error('Failed to load quizzes', err)
    });
  }

  startQuiz(quiz: any) {
    this.selectedQuiz = quiz;
    this.currentQ = 0;
    this.answers = {};
    this.result = null;
    this.screen = 'intro';
    this.resetQuizCoinState();
  }

  viewHistory(quiz: any, event?: Event) {
    event?.stopPropagation();
    if (!this.isLoggedIn || !this.authService.currentUser()?.user_id) {
      alert('Vui lòng đăng nhập để xem lịch sử.');
      return;
    }
    this.historyModalQuiz = quiz;
    this.selectedQuiz = quiz;
    this.showQuizHistoryModal = true;
    this.historyLoading = true;
    this.historyRecords = [];
    this.cdr.markForCheck();

    const uid = String(this.authService.currentUser()!.user_id);
    this.healthTestService.getQuizHistory(quiz.quiz_id, uid).subscribe({
      next: (data) => {
        this.historyRecords = Array.isArray(data) ? data : [];
        this.historyLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.historyLoading = false;
        alert('Lỗi khi tải lịch sử kiểm tra.');
        this.closeQuizHistoryModal();
      }
    });
  }

  closeQuizHistoryModal(): void {
    this.showQuizHistoryModal = false;
    this.historyModalQuiz = null;
    this.historyRecords = [];
    this.historyLoading = false;
    if (this.screen === 'list') {
      this.selectedQuiz = null;
    }
    this.cdr.markForCheck();
  }

  onQuizHistoryOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.closeQuizHistoryModal();
  }

  /** Đóng popup lịch sử rồi mở bài test (không để close xóa quiz đang chọn). */
  startQuizFromHistoryModal(): void {
    const q = this.historyModalQuiz;
    if (!q) return;
    this.showQuizHistoryModal = false;
    this.historyModalQuiz = null;
    this.historyRecords = [];
    this.historyLoading = false;
    this.startQuiz(q);
    this.cdr.markForCheck();
  }

  get filteredHealthOverviewItems(): HealthOverviewItem[] {
    return this.healthOverviewItems.filter((i) => {
      switch (this.healthOverviewTab) {
        case 'all':
          return true;
        case 'overdue':
          return i.isOverdue;
        case 'risk':
          return i.isHighRisk;
        case 'safe':
          return i.isSafe;
        default:
          return true;
      }
    });
  }

  /** Chỉ user đã đăng nhập — vãng lai không thấy nút, không gọi API. */
  openHealthHistoryOverview(): void {
    const uid = this.authService.currentUser()?.user_id;
    if (!uid || !this.isLoggedIn) return;
    if (!this.quizzes.length) return;
    this.showHealthOverviewModal = true;
    this.healthOverviewLoading = true;
    this.healthOverviewItems = [];
    this.healthOverviewTab = 'all';
    this.cdr.markForCheck();

    const requests = this.quizzes.map((q) =>
      this.healthTestService.getQuizHistory(q.quiz_id, String(uid)).pipe(catchError(() => of([])))
    );
    forkJoin(requests).subscribe({
      next: (rows) => {
        const mapped = this.quizzes.map((quiz, idx) => {
          const records = Array.isArray(rows[idx]) ? rows[idx] : [];
          const latest = records.length ? records[0] : null;
          const d = this.historyRecordDate(latest);
          const weekly = quiz.weeklyScreening !== false;
          const overdue = weekly && !!d && Date.now() - d.getTime() > 7 * 86400000;
          const highRisk = !!latest && this.historyBadgeClass(latest) === 'high';
          const safe = !!latest && this.historyBadgeClass(latest) === 'low';
          return { quiz, latest, isOverdue: overdue, isHighRisk: highRisk, isSafe: safe };
        });
        // Chỉ hiện bài đã có ít nhất một lượt làm đã lưu — ẩn bệnh chưa từng test.
        this.healthOverviewItems = mapped.filter((item) => item.latest != null);
        this.healthOverviewLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Health overview load failed', err);
        this.healthOverviewLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  closeHealthOverviewModal(): void {
    this.showHealthOverviewModal = false;
    this.healthOverviewLoading = false;
    this.healthOverviewItems = [];
    this.cdr.markForCheck();
  }

  onHealthOverviewOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.closeHealthOverviewModal();
  }

  startQuizFromHealthOverview(quiz: any): void {
    this.closeHealthOverviewModal();
    this.startQuiz(quiz);
  }

  openQuizHistoryFromOverview(quiz: any): void {
    this.closeHealthOverviewModal();
    this.viewHistory(quiz);
  }

  /** Thời gian tương đối (tiếng Việt) */
  formatRelativeTimeVi(iso: string | Date | undefined): string {
    if (!iso) return '';
    const t = new Date(iso as Date).getTime();
    if (Number.isNaN(t)) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    const days = Math.floor(diffSec / 86400);
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    const months = Math.floor(days / 30);
    return months < 12 ? `${Math.max(1, months)} tháng trước` : `${Math.floor(days / 365)} năm trước`;
  }

  historyRecordDate(rec: any): Date | null {
    const raw = rec?.createdAt || rec?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** Bài đang xem lịch sử có khuyến nghị tầm soát ~mỗi tuần (hiện dòng nhắc + nút khi quá hạn). */
  historyQuizWeeklyCadence(): boolean {
    return this.historyModalQuiz?.weeklyScreening !== false;
  }

  /** Lần làm này đã quá 7 ngày → hiện nút cảnh báo làm lại định kỳ. */
  historyRecordNeedsWeeklyRetake(rec: any): boolean {
    if (!this.historyQuizWeeklyCadence()) return false;
    const d = this.historyRecordDate(rec);
    if (!d) return false;
    return Date.now() - d.getTime() > 7 * 86400000;
  }

  historyBadgeClass(rec: any): string {
    const b = String(rec?.result_badge || '').trim();
    if (b === 'Tốt' || rec?.score === 0) return 'low';
    return 'high';
  }

  historyDisplayBadge(rec: any): string {
    const b = String(rec?.result_badge || '').trim();
    if (b) return b;
    return rec?.score === 0 ? 'Tốt' : 'Lưu ý';
  }

  historyDisplayTitle(rec: any): string {
    return String(rec?.result_title || '').trim() || 'Đã ghi nhận';
  }

  private stripHtml(html: string): string {
    return String(html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  beginQuiz() {
    this.screen = 'quiz';
  }

  handleAnswer(qId: number, value: string) {
    this.answers[qId] = value;
  }

  handleNext() {
    const questions = this.selectedQuiz.questions || [];
    if (this.currentQ < questions.length - 1) {
      this.currentQ++;
    } else {
      this.finishQuiz();
    }
  }

  handlePrev() {
    if (this.currentQ > 0) this.currentQ--;
  }

  calculateScore(): number {
    let yesCount = 0;
    this.selectedQuiz.questions.forEach((q: any) => {
      const answer = this.answers[q.id];
      if (!answer) return;
      if (answer === "A" && (q.options[0].text === "Có" || q.options[0].text === "0 ngày")) {
        if (q.options[0].text === "Có") yesCount++;
      } else if (q.options[0].text !== "Có" && q.options[0].text !== "0 ngày") {
        if (answer === "D" || answer === "E") yesCount++;
      } else if (q.options[0].text === "0 ngày") {
        if (answer !== "A") yesCount++;
      }
    });
    return yesCount;
  }

  finishQuiz() {
    const score = this.calculateScore();
    const res = (this.selectedQuiz.results || []).find((r: any) => {
      if (r?.condition?.operator === "<=") return score <= r.condition.value;
      if (r?.condition?.operator === ">") return score > r.condition.value;
      return false;
    });

    const finalRes = res || {
      id: "R_DEFAULT",
      condition: { operator: ">=", value: 0 },
      title: "Đã ghi nhận kết quả",
      description: "Thông tin của bạn đã được hệ thống ghi nhận. Vui lòng tham khảo ý kiến bác sĩ chuyên khoa để được tư vấn chính xác nhất."
    };

    this.result = {
      ...finalRes,
      score,
      isLow: res ? (res.id.includes('low')) : (score === 0)
    };
    this.screen = 'result';

    this.quizClaimToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.quizCoinClaimed = false;
    this.quizCoinBusy = false;
    this.quizCoinHint = '';

    // Vãng lai: không gửi API — không lưu MongoDB. Chỉ user đăng nhập (có user_id) mới POST /api/quiz-results.
    const uid = this.authService.currentUser()?.user_id;
    if (uid) {
      const badge = this.result.isLow ? 'Tốt' : 'Lưu ý';
      const recText = this.stripHtml(String(finalRes.description || '')).slice(0, 280);
      const req: QuizResultReq = {
        ...this.form,
        user_id: uid,
        quiz_id: this.selectedQuiz.quiz_id,
        score,
        result_id: finalRes.id,
        result_title: String(finalRes.title || ''),
        result_badge: badge,
        recommendation: recText
      };
      this.healthTestService.submitResult(req).subscribe();
    }
    void this.coinService.refreshFromBackend().then(() => this.cdr.markForCheck());
  }

  /** Đã nhận đủ 2 lần / 100 xu bài test trong ngày VN → nút vàng chuyển xám. */
  get quizCoinDailyLimitExhausted(): boolean {
    if (!this.isLoggedIn) return false;
    return this.coinService.isQuizHealthDailyRewardCapReached();
  }

  private resetQuizCoinState(): void {
    this.quizClaimToken = null;
    this.quizCoinClaimed = false;
    this.quizCoinBusy = false;
    this.quizCoinHint = '';
    this.showQuizClaimCelebration = false;
    this.showQuizDailyLimitPopup = false;
    this.showQuizGuestLoginPopup = false;
    this.showQuizFlyingCoin = false;
  }

  /** Bấm "Nhận +50 xu" — mở popup congrate (giống nhắc lịch), chưa gọi API */
  openQuizCoinCelebration(): void {
    if (!this.quizClaimToken || !this.selectedQuiz?.quiz_id) return;
    if (!this.isLoggedIn) {
      this.openQuizGuestLoginPopup();
      return;
    }
    if (this.quizCoinClaimed) return;
    this.quizCoinHint = '';
    if (this.quizCoinDailyLimitExhausted) {
      this.openQuizDailyLimitPopup();
      return;
    }
    this.showQuizClaimCelebration = true;
    this.cdr.markForCheck();
  }

  openQuizDailyLimitPopup(): void {
    if (!this.isLoggedIn) {
      this.openQuizGuestLoginPopup();
      return;
    }
    this.quizCoinHint = '';
    this.showQuizDailyLimitPopup = true;
    this.cdr.markForCheck();
  }

  openQuizGuestLoginPopup(): void {
    this.quizCoinHint = '';
    this.showQuizGuestLoginPopup = true;
    this.cdr.markForCheck();
  }

  closeQuizGuestLoginPopup(): void {
    this.showQuizGuestLoginPopup = false;
    this.cdr.markForCheck();
  }

  onQuizGuestLoginOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.closeQuizGuestLoginPopup();
  }

  /** Trong popup vãng lai: mở form đăng nhập. */
  loginFromQuizGuestPopup(): void {
    this.closeQuizGuestLoginPopup();
    this.authService.openAuthModal();
  }

  closeQuizDailyLimitPopup(): void {
    this.showQuizDailyLimitPopup = false;
    this.cdr.markForCheck();
  }

  onQuizDailyLimitOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.closeQuizDailyLimitPopup();
  }

  onQuizClaimOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.showQuizClaimCelebration = false;
      this.cdr.markForCheck();
    }
  }

  /** Trong popup: bấm +50 xu → gọi API, đóng popup, túi bay về header */
  async confirmQuizClaimFromPopup(): Promise<void> {
    if (!this.quizClaimToken || !this.selectedQuiz?.quiz_id || this.quizCoinBusy) return;

    this.computeQuizFlyingPath();
    this.showQuizClaimCelebration = false;
    this.quizCoinBusy = true;
    this.quizCoinHint = '';
    this.cdr.markForCheck();

    try {
      const res = await this.coinService.applyQuizReward(this.quizClaimToken, this.selectedQuiz.quiz_id);
      this.quizCoinClaimed = true;
      if (!res.alreadyApplied) {
        this.showQuizFlyingCoin = true;
        setTimeout(() => {
          this.showQuizFlyingCoin = false;
          this.cdr.markForCheck();
        }, 2000);
      }
      this.quizCoinHint = '';
    } catch (e: any) {
      const msg = String(e?.message || 'Không thể nhận xu.');
      if (msg.includes('100 xu') || msg.includes('tối đa 2')) {
        this.quizCoinHint = '';
        this.openQuizDailyLimitPopup();
      } else {
        this.quizCoinHint = msg;
      }
    } finally {
      this.quizCoinBusy = false;
      this.cdr.markForCheck();
    }
  }

  private computeQuizFlyingPath(): void {
    const COIN_SIZE = 80;
    const HALF = COIN_SIZE / 2;
    const w = typeof window !== 'undefined' ? window.innerWidth : 0;
    const h = typeof window !== 'undefined' ? window.innerHeight : 0;

    const claimRect = this.quizClaimBurstBtn?.nativeElement?.getBoundingClientRect?.();
    const coinContainer = document.querySelector('.coin-bag-container') as HTMLElement | null;
    const coinImg = coinContainer?.querySelector('img.coin-bag-img') as HTMLImageElement | null;
    const coinRect = (coinImg || coinContainer)?.getBoundingClientRect?.();

    const startX = claimRect ? claimRect.left + claimRect.width / 2 - HALF : w / 2 - HALF;
    const startY = claimRect ? claimRect.top + claimRect.height / 2 - HALF : h / 2 - HALF;

    const endX = coinRect ? coinRect.left + coinRect.width / 2 - HALF : w - 17 - HALF;
    const endY = coinRect ? coinRect.top + coinRect.height / 2 - HALF : h - 260;

    const dx = endX - startX;
    const dy = endY - startY;

    const peakY = Math.min(startY, endY) - 160;
    const ctrlX = startX + dx / 2;
    const ctrlY = peakY;

    const ctrlRelX = ctrlX - startX;
    const ctrlRelY = ctrlY - startY;

    this.flyStartX = startX;
    this.flyStartY = startY;
    this.flyOffsetPath = `path('M 0 0 Q ${ctrlRelX} ${ctrlRelY} ${dx} ${dy}')`;
  }

  resetAll() {
    this.screen = 'list';
    this.selectedQuiz = null;
    this.currentQ = 0;
    this.answers = {};
    this.result = null;
    this.historyRecords = [];
    this.closeQuizHistoryModal();
    this.form = { name: '', province: '', phone: '', dob: '', gender: 'Nam', referralCode: '', agreed: true };
    this.resetQuizCoinState();
  }

  get currentQuestion() {
    return this.selectedQuiz?.questions ? this.selectedQuiz.questions[this.currentQ] : null;
  }

  get progress() {
    const totalQ = this.selectedQuiz?.questions?.length || 1;
    return this.selectedQuiz ? (this.currentQ / totalQ) * 100 : 0;
  }
}
