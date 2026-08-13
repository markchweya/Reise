import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, ScreenHeader, SourceLabel } from "../src/components/ui";
import { useReiseStore } from "../src/store";
import { palette } from "../src/theme";

const products = [
  { name: "Regular ticket", price: 5.2, saving: "Flexible" },
  { name: "Supersaver", price: 3.65, saving: "Save CHF 1.55" },
  { name: "Half Fare supersaver", price: 1.83, saving: "Best eligible option" },
];

export default function TicketsScreen() {
  const { travelcard, unlock } = useReiseStore();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Compare before you travel"
        title="Prototype fares"
        action={<SourceLabel>Not for purchase</SourceLabel>}
      />
      <Text style={styles.notice}>
        Prototype fare — verify the final price with the transport provider.
      </Text>
      <Card style={styles.travelcard}>
        <Text style={styles.miniLabel}>YOUR TRAVELCARD</Text>
        <View style={styles.travelcardRow}>
          <Text style={styles.travelcardName}>
            {travelcard === "half_fare" ? "Half Fare Travelcard" : travelcard}
          </Text>
          <Text style={styles.travelcardEdit}>Change</Text>
        </View>
      </Card>
      <View style={styles.list}>
        {products.map((product, index) => (
          <Card
            key={product.name}
            style={index === 2 ? styles.best : undefined}
          >
            <View style={styles.row}>
              <View>
                <Text style={styles.product}>{product.name}</Text>
                <Text style={styles.saving}>{product.saving}</Text>
              </View>
              <Text style={styles.price}>CHF {product.price.toFixed(2)}</Text>
            </View>
            {index === 2 ? (
              <Text style={styles.select} onPress={() => unlock("fare-finder")}>
                Select for journey
              </Text>
            ) : null}
          </Card>
        ))}
      </View>
      <Text style={styles.legal}>
        Reise does not sell tickets in this MVP. Prices are simulated for
        product testing and do not represent an offer.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  content: { padding: 20, paddingTop: 66 },
  notice: {
    color: palette.warning,
    backgroundColor: palette.warningSoft,
    borderRadius: 12,
    padding: 13,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: 16,
    overflow: "hidden",
  },
  travelcard: { marginBottom: 20 },
  miniLabel: {
    color: palette.slate,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  travelcardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  travelcardName: { color: palette.ink, fontSize: 18, fontWeight: "800" },
  travelcardEdit: { color: palette.red, fontWeight: "800" },
  list: { gap: 12 },
  best: { borderWidth: 2, borderColor: palette.red },
  row: { flexDirection: "row", justifyContent: "space-between" },
  product: { color: palette.ink, fontSize: 17, fontWeight: "800" },
  saving: { color: palette.slate, fontSize: 12, marginTop: 5 },
  price: { color: palette.ink, fontSize: 19, fontWeight: "900" },
  select: {
    color: palette.paper,
    backgroundColor: palette.red,
    textAlign: "center",
    padding: 13,
    borderRadius: 12,
    overflow: "hidden",
    fontWeight: "800",
    marginTop: 16,
  },
  legal: { color: palette.slate, fontSize: 11, lineHeight: 17, marginTop: 20 },
});
