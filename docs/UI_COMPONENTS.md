# Arayüz Bileşenleri (React / Vue)

- **`PlateInput.js`**: Plaka giriş alanı. Otomatik büyük harf yapar, boşlukları temizler. Prop olarak `onPlateVerified` fonksiyonu alır.
- **`TimerButton.js`**: `5 dk`, `10 dk` gibi butonlar. Prop olarak `duration` ve `disabled` (boolean) alır.
- **`VehicleCard.js`**: Vale panosundaki her bir araç kartı. Prop olarak `vehicle` objesi alır. İçinde aracın durumuna göre renk ve metinleri gösterir.
- **`StatusChip.js`**: `ÇAĞRILDI`, `HAZIR` gibi durum etiketleri. Prop olarak `status` alır ve doğru rengi/metni gösterir.
- **`CountdownCircle.js`**: Geri sayım halkası. Prop olarak `startTime` ve `duration` alır.