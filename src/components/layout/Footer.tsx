import { Link } from "react-router-dom";
import { Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4">🍜 Warung Mie Balap</h3>
            <p className="text-gray-400 text-sm">
              Mie ayam spesial dengan resep turun-temurun. 
              Rasanya lezat, harganya terjangkau.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Menu</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/products" className="hover:text-white">
                  Daftar Menu
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white">
                  Lacak Pesanan
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Hubungi Kami</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="https://wa.me/6282284087929" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  +62 822-8408-7929
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <a href="https://maps.app.goo.gl/X87jesMQPxxHxEfH8" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Mie Balap (Warung Jecy) Equator 24 Jam
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Warung Mie Balap. Hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
