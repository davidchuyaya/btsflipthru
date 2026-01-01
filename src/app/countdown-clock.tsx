export default function CountdownClock() {
    const endDate = new Date("2026-03-20T00:00:00+09:00").getTime();
    function getDaysLeft() {
        const now = Date.now();
        const diff = endDate - now;
        if (diff <= 0) {
            return 0;
        }
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <h3>BTS COMEBACK: March 20, 2026</h3>
            <div className="flex flex-row gap-4 items-center justify-center">
                <div className="relative w-25 h-22">
                    <div className="w-25 h-22 font-heading text-7xl! rounded-2xl bg-main text-accent-light flex items-center justify-center">
                        <span>{getDaysLeft()}</span>
                        {/* Vertical line through the days number */}
                    </div>
                    <div className="h-1 w-25 bg-background absolute top-11"></div>
                </div>
                <h1 className="text-7xl!">Days</h1>
            </div>
            <h3>countdown to 00:00</h3>
        </div>
    );
}
