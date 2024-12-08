class ClinicScheduler {
    constructor() {
        this.appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        this.selectedSlot = null;
        this.weatherAPI = '6a73eb5c1a57f4c3df3d1d66c4927326'; // OpenWeatherMap API key
        this.initializeElements();
        this.initializeEventListeners();
        this.updateDaySelector();
        this.loadWeatherData();
        this.checkAndShowReminders();
    }

    initializeElements() {
        this.daySelect = document.getElementById('daySelect');
        this.availableSlots = document.getElementById('availableSlots');
        this.bookingForm = document.getElementById('bookingForm');
        this.patientName = document.getElementById('patientName');
        this.patientPhone = document.getElementById('patientPhone');
        this.patientAge = document.getElementById('patientAge');
        this.visitType = document.getElementById('visitType');
        this.patientNotes = document.getElementById('patientNotes');
        this.selectedTimeSpan = document.getElementById('selectedTime');
        this.currentAppointments = document.getElementById('currentAppointments');
        this.smartReminders = document.getElementById('smartReminders');
        this.totalAppointments = document.getElementById('totalAppointments');
        this.todayAppointments = document.getElementById('todayAppointments');
    }

    async loadWeatherData() {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Cairo,EG&appid=${this.weatherAPI}&units=metric&lang=ar`);
            const data = await response.json();
            const weatherSpan = document.getElementById('weatherData');
            weatherSpan.innerHTML = `درجة الحرارة: ${Math.round(data.main.temp)}°C | الرطوبة: ${data.main.humidity}% | ${data.weather[0].description}`;
        } catch (error) {
            console.error('Error fetching weather data:', error);
        }
    }

    checkAndShowReminders() {
        const today = new Date();
        const todayAppointments = this.appointments.filter(app => {
            const appDate = new Date(app.datetime);
            return appDate.toDateString() === today.toDateString();
        });

        if (todayAppointments.length > 0) {
            this.smartReminders.style.display = 'block';
            this.smartReminders.innerHTML = `
                <i class="fas fa-bell"></i>
                <strong>تذكير:</strong> لديك ${todayAppointments.length} مواعيد اليوم
                <ul>
                    ${todayAppointments.map(app => `
                        <li>${app.name} - ${this.formatTime({
                            hour: new Date(app.datetime).getHours(),
                            minute: new Date(app.datetime).getMinutes()
                        })}</li>
                    `).join('')}
                </ul>
            `;
        }

        this.updateAppointmentCounts();
    }

    updateAppointmentCounts() {
        const today = new Date();
        const todayApps = this.appointments.filter(app => 
            new Date(app.datetime).toDateString() === today.toDateString()
        ).length;

        this.totalAppointments.textContent = this.appointments.length;
        this.todayAppointments.textContent = todayApps;
    }

    initializeEventListeners() {
        this.daySelect.addEventListener('change', () => this.generateTimeSlots());
        document.getElementById('confirmBooking').addEventListener('click', () => this.confirmBooking());
        document.getElementById('cancelBooking').addEventListener('click', () => this.cancelBooking());
        
        document.querySelectorAll('.appointments-filter .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.appointments-filter .filter-btn').forEach(b => 
                    b.classList.remove('active')
                );
                e.target.classList.add('active');
                this.filterAppointments(e.target.dataset.filter);
            });
        });
    }

    filterAppointments(filter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filteredAppointments = this.appointments;

        switch(filter) {
            case 'today':
                filteredAppointments = this.appointments.filter(app => 
                    new Date(app.datetime).toDateString() === today.toDateString()
                );
                break;
            case 'upcoming':
                filteredAppointments = this.appointments.filter(app => 
                    new Date(app.datetime) > today
                );
                break;
        }

        this.renderAppointments(filteredAppointments);
    }

    confirmBooking() {
        const name = this.patientName.value.trim();
        const phone = this.patientPhone.value.trim();
        const age = this.patientAge.value.trim();
        const visitType = this.visitType.value;
        const notes = this.patientNotes.value.trim();
        
        if (!name || !phone || !this.selectedSlot) {
            alert('الرجاء ملء جميع البيانات المطلوبة');
            return;
        }
        
        if (!this.validatePhone(phone)) {
            alert('الرجاء إدخال رقم هاتف صحيح');
            return;
        }

        const appointment = {
            id: Date.now(),
            name,
            phone,
            age,
            visitType,
            notes,
            datetime: this.selectedSlot.toISOString(),
            status: 'upcoming'
        };
        
        this.appointments.push(appointment);
        this.saveAppointments();
        this.resetForm();
        this.generateTimeSlots();
        this.renderAppointments();
        this.checkAndShowReminders();
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'smart-reminder fade-in';
        successMessage.innerHTML = `
            <i class="fas fa-check-circle"></i>
            تم حجز الموعد بنجاح! سيتم إرسال رسالة تأكيد على الرقم ${phone}
        `;
        this.bookingForm.parentNode.insertBefore(successMessage, this.bookingForm.nextSibling);
        
        setTimeout(() => successMessage.remove(), 5000);
    }

    validatePhone(phone) {
        const phoneRegex = /^(01)[0-2,5]{1}[0-9]{8}$/;
        return phoneRegex.test(phone);
    }

    renderAppointments(filteredAppointments = this.appointments) {
        this.currentAppointments.innerHTML = '';
        
        const sortedAppointments = [...filteredAppointments].sort((a, b) => 
            new Date(a.datetime) - new Date(b.datetime)
        );
        
        sortedAppointments.forEach(app => {
            const date = new Date(app.datetime);
            const isToday = date.toDateString() === new Date().toDateString();
            const li = document.createElement('li');
            li.className = 'fade-in';
            li.innerHTML = `
                <div>
                    <strong>${app.name}</strong>
                    <span class="status-badge ${isToday ? 'status-today' : 'status-upcoming'}">
                        ${isToday ? 'اليوم' : 'قادم'}
                    </span>
                    <br>
                    <small>
                        ${this.formatDate(date)} ${this.formatTime({
                            hour: date.getHours(),
                            minute: date.getMinutes()
                        })}
                        ${app.visitType ? ` | ${this.getVisitTypeText(app.visitType)}` : ''}
                    </small>
                    ${app.notes ? `<p class="appointment-notes">${app.notes}</p>` : ''}
                </div>
                <button class="delete-appointment" onclick="scheduler.deleteAppointment(${app.id})">
                    <i class="fas fa-times"></i> إلغاء الحجز
                </button>
            `;
            this.currentAppointments.appendChild(li);
        });
    }

    getVisitTypeText(type) {
        const types = {
            'first': 'زيارة أولى',
            'follow': 'متابعة',
            'emergency': 'حالة طارئة'
        };
        return types[type] || '';
    }

    updateDaySelector() {
        // Clear existing options except the first one
        while (this.daySelect.options.length > 1) {
            this.daySelect.remove(1);
        }

        // Get next 4 weeks of available days
        const days = this.getNextAvailableDays(4);
        
        days.forEach(day => {
            const option = document.createElement('option');
            option.value = day.toISOString();
            option.textContent = this.formatDate(day);
            this.daySelect.appendChild(option);
        });
    }

    getNextAvailableDays(weeks) {
        const days = [];
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < weeks * 7; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + i);
            
            // Check if it's Saturday (6) or Monday (1)
            if (date.getDay() === 6 || date.getDay() === 1) {
                days.push(date);
            }
        }

        return days;
    }

    generateTimeSlots() {
        this.availableSlots.innerHTML = '';
        const selectedDate = new Date(this.daySelect.value);
        
        if (!selectedDate) return;

        const slots = this.getAvailableTimeSlots(selectedDate);
        
        slots.forEach(slot => {
            const isBooked = this.isSlotBooked(selectedDate, slot);
            const button = document.createElement('button');
            button.className = `time-slot ${isBooked ? 'booked' : ''}`;
            button.textContent = this.formatTime(slot);
            
            if (!isBooked) {
                button.addEventListener('click', () => this.selectTimeSlot(selectedDate, slot));
            }
            
            this.availableSlots.appendChild(button);
        });
    }

    getAvailableTimeSlots(date) {
        const slots = [];
        const isSaturday = date.getDay() === 6;
        
        const startHour = 10;
        const endHour = isSaturday ? 13 : 11;
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 10) {
                slots.push({ hour, minute });
            }
        }
        
        return slots;
    }

    isSlotBooked(date, slot) {
        const slotTime = new Date(date);
        slotTime.setHours(slot.hour, slot.minute, 0, 0);
        
        return this.appointments.some(app => {
            const appTime = new Date(app.datetime);
            return appTime.getTime() === slotTime.getTime();
        });
    }

    selectTimeSlot(date, slot) {
        const datetime = new Date(date);
        datetime.setHours(slot.hour, slot.minute, 0, 0);
        
        this.selectedSlot = datetime;
        this.selectedTimeSpan.textContent = `${this.formatDate(date)} ${this.formatTime(slot)}`;
        this.bookingForm.classList.remove('hidden');
        
        // Remove previous selection
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current slot
        event.target.classList.add('selected');
    }

    cancelBooking() {
        this.resetForm();
    }

    resetForm() {
        this.patientName.value = '';
        this.patientPhone.value = '';
        this.patientAge.value = '';
        this.visitType.value = '';
        this.patientNotes.value = '';
        this.selectedSlot = null;
        this.bookingForm.classList.add('hidden');
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    deleteAppointment(id) {
        this.appointments = this.appointments.filter(app => app.id !== id);
        this.saveAppointments();
        this.generateTimeSlots();
        this.renderAppointments();
    }

    saveAppointments() {
        localStorage.setItem('appointments', JSON.stringify(this.appointments));
    }

    formatDate(date) {
        return date.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(slot) {
        return new Date(2020, 0, 1, slot.hour, slot.minute)
            .toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
            });
    }
}

// Initialize the scheduler when the page loads
let scheduler;
document.addEventListener('DOMContentLoaded', () => {
    scheduler = new ClinicScheduler();
    scheduler.renderAppointments();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }

    // Add to Home Screen prompt for iOS
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show the "Add to Home Screen" button
        const addToHomeBtn = document.createElement('button');
        addToHomeBtn.className = 'add-to-home-btn';
        addToHomeBtn.innerHTML = '<i class="fas fa-download"></i> تثبيت التطبيق';
        document.querySelector('header').appendChild(addToHomeBtn);
        
        addToHomeBtn.addEventListener('click', (e) => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
                addToHomeBtn.style.display = 'none';
            });
        });
    });
});
