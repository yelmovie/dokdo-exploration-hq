# Dokdo Exploration HQ

**Dokdo Exploration HQ** is a tablet-friendly educational web game for upper elementary students. Learners explore Dokdo through mission-based activities about location, landforms, historical records, ecology, conservation, and final presentation.

The goal is not to build a simple quiz app. The project is designed as an interactive learning experience where students read clues, compare evidence, connect routes, arrange historical records, classify ideas, and build a final briefing board.

## Key Features

- **Mission-based learning flow** from map exploration to final presentation
- **Interactive gameplay** using drag-and-drop, route connection, matching, sequencing, and evidence selection
- **Grade 4 deep-learning level questions** focused on reasoning, comparison, and evidence-based thinking
- **Dokdo-themed visual assets** including backgrounds, characters, icons, badges, signs, and mission objects
- **Tablet-first 16:9 responsive layout** for classroom devices, interactive whiteboards, and desktop screens
- **No backend required** for the MVP; progress can be saved locally with `localStorage`
- **Stable one-year maintenance structure** with separated assets, mission data, question data, and save management

## Target Learners

This project is designed for upper elementary students, especially Grade 4 learners who are ready to move beyond simple fact recall and practice evidence-based explanation.

## Learning Goals

Students will be able to:

1. Explain Dokdo's location using map and direction clues.
2. Analyze Dokdo's landform features and living conditions.
3. Organize historical records in chronological order.
4. Connect Dokdo's ecology with responsible conservation actions.
5. Build a final briefing board using collected evidence.
6. Present their learning with a clear structure and supporting reasons.

## Page Flow

1. **Main Screen**  
   Start the Dokdo exploration with title art, character assets, and mission entry buttons.

2. **Exploration HQ Briefing**  
   Introduce the full mission goal and explain the five investigation areas.

3. **Mission Map**  
   Select missions through a map-style stage system with locked and unlocked mission nodes.

4. **Route Restoration Room**  
   Restore the route to Dokdo by reading direction, location, and map clues.

5. **Rock Island Analysis Lab**  
   Analyze landform features, steep rocks, narrow flat areas, waves, wind, and living conditions.

6. **Historical Archive**  
   Arrange historical records, compare evidence, and distinguish facts from opinions.

7. **Ecology Protection Mission**  
   Choose responsible actions to protect birds, plants, marine life, and island habitats.

8. **Briefing Board Builder**  
   Drag evidence cards into location, landform, history, ecology, and protection sections.

9. **Final Presentation Prep**  
   Organize a presentation script using evidence collected from previous missions.

10. **Completion and Exhibition**  
   Show the final certificate, collected badges, briefing board, and presentation results.

## Suggested Tech Stack

- **Phaser 3** for interactive game scenes
- **TypeScript** for stable long-term development
- **Vite** for fast local development and build
- **CSS/HTML overlay** for buttons, panels, modal windows, and responsive UI
- **localStorage** for MVP progress saving without a backend

## Recommended Project Structure

```txt
src/
  main.ts
  game/
    gameConfig.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      MainScene.ts
      BriefingScene.ts
      MissionMapScene.ts
      RouteScene.ts
      GeologyScene.ts
      HistoryScene.ts
      EcologyScene.ts
      BriefingBoardScene.ts
      PresentationScene.ts
      CompletionScene.ts
    managers/
      AssetManager.ts
      SaveManager.ts
      AudioManager.ts
      SceneTransitionManager.ts
      MissionStateManager.ts
    data/
      assetManifest.ts
      pageConfig.ts
      missionData.ts
      questionData.ts
      badgeData.ts
    ui/
      DomOverlay.ts
      MissionHeader.ts
      FeedbackModal.ts
      EvidenceCard.ts
      ProgressPanel.ts
      BadgePanel.ts
    utils/
      safeStorage.ts
      responsiveLayout.ts
      assetPath.ts
      touchGuard.ts
public/
  assets/
    backgrounds/
    icons/
    samplepages/
    sound/
```

## Getting Started

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

To preview the build locally:

```bash
npm run preview
```

## MVP Requirements

The MVP should include:

- All 10 pages connected through a stable flow
- At least five mission types with different interactions
- A safe asset manifest instead of scattered hard-coded image paths
- Local progress saving and recovery
- Responsive 16:9 layout for tablet landscape mode
- Error-safe image and sound loading
- No duplicate scene logic or unused dead code

## Interaction Design

The game should avoid repetitive card-click-only gameplay. Recommended interaction types include:

- Route connection on a map
- Drag-and-drop evidence cards
- Matching clues with map features
- Sequencing historical records
- Selecting multiple correct answers
- Separating facts from opinions
- Building a briefing board
- Completing a presentation structure

## Maintenance Notes

For long-term stability:

- Keep all asset paths in one manifest file.
- Keep all mission and question data outside scene files.
- Add a save-data version number for future migration.
- Handle broken or missing localStorage data safely.
- Prevent duplicate scene transitions from repeated clicks.
- Avoid using only `100vh`; account for real viewport height on tablets and in-app browsers.
- Keep UI buttons in CSS instead of image-only buttons.

## Content Accuracy

Educational facts and historical content should be reviewed by the teacher before classroom use. If official wording is required, verify the content against trusted public sources such as official Dokdo education or government reference materials.

## License

This project is intended for educational use. Check the license and usage rights of all included image, sound, and design assets before public distribution.
