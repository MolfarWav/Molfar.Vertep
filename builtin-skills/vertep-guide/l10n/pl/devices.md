<!-- source: abe560e8cdbc -->
# Urządzenia, synchronizacja i kopie zapasowe

Jak używać Molfar Vertep na telefonie, przenosić swoje historie między urządzeniami, instalować go jak aplikację i przenosić na nowy komputer.

## Otwieranie z telefonu

W Ustawieniach, Serwerze „Zezwól innym urządzeniom w mojej sieci” pozwala telefonowi lub innemu komputerowi w tej samej sieci otworzyć Molfar Vertep. Kod QR pokazuje adres; zeskanuj go aparatem telefonu. Każde konto nadal wymaga hasła. Telefony pozwalają na mikrofon i instalację jako aplikacja tylko przez HTTPS, więc w tym celu włączasz „Używaj HTTPS” w tej samej sekcji. Te sekcje są widoczne dla administratora.

## Instalacja jako aplikacja

„Zainstaluj aplikację” w menu konta umieszcza Molfar Vertep na ekranie głównym lub na liście aplikacji komputera. Otwiera się wtedy we własnym oknie, bez paska przeglądarki. Na iPhonie pokazuje, gdzie Safari to trzyma: Udostępnij, potem Do ekranu początkowego. Telefon, który otwiera Twój komputer pod adresem http, najpierw potrzebuje https, a okno dialogowe wyjaśnia, jak to zrobić. Otwarta aplikacja ma też „Pełny ekran”, który otwiera ją we własnej karcie przeglądarki, którą możesz zainstalować.

## Synchronizacja

„Synchronizuj urządzenia” w menu konta lub Ustawienia, Synchronizacja. Zaloguj się przez Google raz na każdym urządzeniu. Gdy kończysz grę, naciśnij „Wyślij”; na drugim urządzeniu naciśnij „Pobierz” i graj dalej. Po pierwszym razie podróżują tylko zmiany.

- Ty wybierasz, co podróżuje: aplikacje i ich dane, czaty i projekty Molfara, obrazy, dźwięk i wideo oraz klucze API z ustawieniami MCP. Klucze podróżują tylko, jeśli je włączysz, zabezpieczone frazą hasła, którą wpisujesz na każdym urządzeniu.
- Jeśli ten sam czat zmienił się na obu urządzeniach, wybierasz, którą wersję zachować. Druga jest zapisywana na 30 dni.
- Jest też opcja „Folder” dla folderu synchronizowanego (Syncthing, Google Drive na komputer) lub pamięci USB.

## Kopia zapasowa

Ustawienia, Kopia zapasowa eksportuje cały Twój profil: aplikacje z ich danymi, pamięć Molfara i czaty. Naciśnij „Eksportuj profil”. Dodaj hasło, aby dołączyć swoje klucze API, zaszyfrowane; bez niego kopia nie ma kluczy i wpisujesz je ponownie. Import najpierw pokazuje, co jest w środku. Gdy naciskasz „Zastąp mój profil”, Twój obecny profil jest zapisywany, zanim zostanie zastąpiony.

Użyj kopii zapasowej, aby przenieść się raz na nowy komputer. Użyj synchronizacji, aby często przenosić się tam i z powrotem.

## Tylko jedna aplikacja

Szczegóły aplikacji na stronie głównej mają „Eksportuj aplikację”, co tworzy plik kopii zapasowej tylko tej aplikacji. „Importuj aplikację” przyjmuje taki plik. Zobacz [[apps]].

Zobacz też [[settings]].
