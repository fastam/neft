# ai_tutor.py

class AITutor:
    def __init__(self):
        self.reglament_rules = {
            "max_temp_p3": 340.0,
            "critical_temp": 360.0,
            "rule_ref": "п. 7.9.1 и Раздел 3.5 Регламента ЭЛОУ-АВТ-4"
        }

    def generate_debriefing(self, engine):
        max_temp_reached = max([state['temp'] for state in engine.history])
        pump_failed = any(not state['pump'] for state in engine.history)
        
        report = []
        report.append("=== ИНТЕЛЛЕКТУАЛЬНЫЙ ОТЧЕТ О ТРЕНИРОВКЕ ===")
        report.append(f"Итоговый балл: {engine.score} / 100")
        
        if pump_failed:
            report.append("Событие: Зафиксирована остановка сырьевого насоса Н-1.")
            if max_temp_reached >= self.reglament_rules["critical_temp"]:
                report.append(f"ОШИБКА: Допущен прогар труб змеевиков печи П-3. Макс. температура достигла {max_temp_reached:.1f}°C.")
                report.append(f"Справка: Согласно {self.reglament_rules['rule_ref']}, прекращение подачи сырья без отсечения топливного газа приводит к пожару.")
                report.append("Рекомендация: При остановке насоса необходимо немедленно запустить резервный или перевести TRC 3 в ручной режим и закрыть газ.")
            elif max_temp_reached > self.reglament_rules["max_temp_p3"]:
                report.append(f"ЗАМЕЧАНИЕ: Наблюдался перегрев печи до {max_temp_reached:.1f}°C. Действия были верными, но недостаточно быстрыми.")
            else:
                report.append("ОТЛИЧНО: Оператор действовал быстро и не допустил перегрева печи П-3.")
        else:
            report.append("Тренировка прошла в штатном режиме.")
            
        return "\n".join(report)